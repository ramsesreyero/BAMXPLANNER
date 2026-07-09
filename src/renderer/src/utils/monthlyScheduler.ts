/**
 * monthlyScheduler.ts
 *
 * Motor de planificación mensual de rutas para el Banco de Alimentos BAMX.
 *
 * Mejoras respecto a la versión anterior:
 *  1. generate() es ahora async y usa distancias OSRM reales.
 *  2. Scheduler en 2 fases por día: Recolección → Distribución.
 *  3. Agrupación geográfica (k-means simple) para asignar zonas a cada camión.
 *  4. Respeto de preferred_day de colonias y fixed_day de instituciones.
 *  5. Distribución inteligente de beneficiarios por zona geográfica.
 *  6. Cronograma con hora estimada de llegada/salida por parada.
 */

import { RouteStop, GeneticRouting } from './geneticRouting';
import { getDistanceMatrix } from './distanceMatrix';

export interface MonthlyPlan {
  days: DailyRoster[];
  monthName: string;
  warnings?: PlanWarning[];
}

export interface PlanWarning {
  type: 'reprogrammed' | 'omitted';
  stopName: string;
  stopType: RouteStop['type'];
  originalDate: string;
  newDate?: string;
  reason: string;
}

export interface DailyRoster {
  date: string;
  truckA: TruckRoute;
  truckB: TruckRoute;
}

export interface TruckRoute {
  stops: RouteStop[];
  driverId?: number | null;
  truckId?: number | null;
  truckCapacityKg?: number;
  driverMaxMinutes?: number;
  stats?: {
    distanceKm: number;
    durationMinutes: number;
    optimized: boolean;
    fromOSRM: boolean;
  };
}

interface PendingStop {
  stop: RouteStop;
  originalDate: string;
  preferredTruck: 'truckA' | 'truckB';
  allowedDays?: string | null;
  restrictedDays?: string | null;
  reason: string;
}

// ─── Constantes operativas BAMX ───────────────────────────────────────────────

/** Coordenadas reales del CEDIS: C. Iturbide 1407, San José, 88230 Nuevo Laredo, Tamps. */
const DEFAULT_CEDIS_LAT = 27.477850806886945;
const DEFAULT_CEDIS_LNG = -99.49498391012905;

const DEFAULT_TRUCK_CAPACITY_KG = 3000;
const DEFAULT_START_TIME = '07:00';
const DEFAULT_END_TIME = '18:00';

// ─── Clase Principal ──────────────────────────────────────────────────────────

export class MonthlyScheduler {
  private startDate: Date;
  private endDate: Date;
  private colonies: any[];
  private supermarkets: any[];
  private institutions: any[];
  private caridad: any[];
  private trucks: any[];
  private drivers: any[];
  private gaConfig: { popSize: number; numGenerations: number; mutationRate: number };
  private nonWorkingDays: string[];
  /** Coordenadas del CEDIS (leidas desde ajustes en tiempo de ejecucion) */
  private cedisLat: number;
  private cedisLng: number;
  /** Máximo de paradas por camión por día (configurable en Ajustes > Algoritmo) */
  private maxStopsPerTruck: number;
  private openingTime: string;
  private closingTime: string;
  private avgUnloadingTime: number;
  private pendingStops: PendingStop[] = [];

  constructor(config: {
    startDate?: string;
    colonies: any[];
    supermarkets: any[];
    institutions: any[];
    caridad: any[];
    trucks: any[];
    drivers: any[];
    gaConfig?: { popSize?: number; numGenerations?: number; mutationRate?: number };
    nonWorkingDays?: string[];
    /** Latitud del CEDIS (leida desde ajustes). Default: C. Iturbide 1407 NL */
    cedisLat?: number;
    /** Longitud del CEDIS (leida desde ajustes). Default: C. Iturbide 1407 NL */
    cedisLng?: number;
    /** Máximo de paradas por camión por día. Default: 10. Configurable en Ajustes > Algoritmo. */
    maxStopsPerTruck?: number;
    openingTime?: string;
    closingTime?: string;
    avgUnloadingTime?: number;
  }) {
    if (config.startDate) {
      const [y, m] = config.startDate.split('-').map(Number);
      this.startDate = new Date(y, m - 1, 1);
    } else {
      const now = new Date();
      this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    this.endDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth() + 1, 0);

    this.colonies = config.colonies;
    this.supermarkets = config.supermarkets;
    this.institutions = config.institutions;
    this.caridad = config.caridad;
    this.trucks = (config.trucks || []).filter((t: any) => t.is_available !== 0);
    this.drivers = (config.drivers || []).filter((d: any) => d.is_available !== 0);

    this.gaConfig = {
      popSize: config.gaConfig?.popSize ?? 120,
      numGenerations: config.gaConfig?.numGenerations ?? 500,
      mutationRate: config.gaConfig?.mutationRate ?? 0.05
    };

    this.nonWorkingDays = config.nonWorkingDays ?? [];
    // Coordenadas del CEDIS: usar las de ajustes o el valor real por defecto
    this.cedisLat = config.cedisLat ?? DEFAULT_CEDIS_LAT;
    this.cedisLng = config.cedisLng ?? DEFAULT_CEDIS_LNG;
    // Límite de paradas por camión por día
    this.maxStopsPerTruck = Number(config.maxStopsPerTruck ?? 10);
    this.openingTime = config.openingTime || DEFAULT_START_TIME;
    this.closingTime = config.closingTime || DEFAULT_END_TIME;
    this.avgUnloadingTime = Number(config.avgUnloadingTime ?? 20);
  }

  // ─── Helper: verificar capacidad de paradas ─────────────────────────────────

  /** Retorna true si el camión todavía puede recibir más paradas hoy. */
  private hasCapacity(truck: TruckRoute): boolean {
    return truck.stops.length < this.maxStopsPerTruck;
  }

  private getTruckCapacity(truck: TruckRoute): number {
    return Number(truck.truckCapacityKg ?? DEFAULT_TRUCK_CAPACITY_KG);
  }


  private canAddLoad(truck: TruckRoute, stop: RouteStop): boolean {
    const capacity = this.getTruckCapacity(truck);
    let collectionLoad = 0;
    let deliveryLoad = 0;
    for (const s of truck.stops) {
      if (s.demand > 0) {
        collectionLoad += s.demand;
      } else {
        deliveryLoad += Math.abs(s.demand);
      }
    }

    if (stop.demand > 0) {
      collectionLoad += stop.demand;
    } else {
      deliveryLoad += Math.abs(stop.demand);
    }

    return collectionLoad <= capacity && deliveryLoad <= capacity;
  }

  private canReceiveStop(truck: TruckRoute, stop: RouteStop): boolean {
    return this.hasCapacity(truck) && this.canAddLoad(truck, stop);
  }

  private addStopOrQueue(
    day: DailyRoster,
    preferredTruck: 'truckA' | 'truckB',
    stop: RouteStop,
    options: {
      allowedDays?: string | null;
      restrictedDays?: string | null;
      reason: string;
    }
  ): boolean {
    const primary = day[preferredTruck];
    const secondaryKey = preferredTruck === 'truckA' ? 'truckB' : 'truckA';
    const secondary = day[secondaryKey];

    if (this.canReceiveStop(primary, stop)) {
      primary.stops.push(stop);
      if (stop.type === 'colony' || stop.type === 'institution') {
        console.log(`[Scheduler] Asignado: "${stop.name}" (${stop.type}, ${Math.abs(stop.demand)} kg) en ${day.date} (${preferredTruck})`);
      }
      return true;
    }

    if (this.canReceiveStop(secondary, stop)) {
      secondary.stops.push(stop);
      if (stop.type === 'colony' || stop.type === 'institution') {
        console.log(`[Scheduler] Asignado: "${stop.name}" (${stop.type}, ${Math.abs(stop.demand)} kg) en ${day.date} (${secondaryKey} - Alternativo)`);
      }
      return true;
    }

    if (stop.type === 'colony' || stop.type === 'institution') {
      console.log(`[Scheduler] Sin capacidad hoy: "${stop.name}" (${stop.type}, ${Math.abs(stop.demand)} kg) en ${day.date}. Se mueve a pendientes.`);
    }
    this.pendingStops.push({
      stop,
      originalDate: day.date,
      preferredTruck,
      allowedDays: options.allowedDays,
      restrictedDays: options.restrictedDays,
      reason: options.reason
    });
    return false;
  }

  private processPendingStops(plan: MonthlyPlan): void {
    if (this.pendingStops.length === 0) return;

    // Ordenar paradas pendientes por demanda descendente (First-Fit Decreasing)
    // para colocar primero los cargamentos más grandes en los días con espacio.
    this.pendingStops.sort((a, b) => Math.abs(b.stop.demand) - Math.abs(a.stop.demand));

    const warnings: PlanWarning[] = plan.warnings || [];

    for (const pending of this.pendingStops) {
      const candidateDays = plan.days.filter(day => {
        if (day.date <= pending.originalDate) return false;
        const dow = new Date(day.date + 'T12:00:00').getDay();
        if (dow === 0 || this.nonWorkingDays.includes(day.date)) return false;
        if (pending.allowedDays && !this.matchesDayOfWeek(pending.allowedDays, dow)) return false;
        if (pending.restrictedDays && this.isRestrictedForDay(pending.restrictedDays, dow)) return false;
        if (this.dayHasStop(day, pending.stop)) return false;
        return true;
      });

      let placedDate: string | undefined;
      for (const day of candidateDays) {
        const primary = day[pending.preferredTruck];
        const secondary = pending.preferredTruck === 'truckA' ? day.truckB : day.truckA;
        const stop = {
          ...pending.stop,
          reprogrammedFrom: pending.originalDate,
          planningNote: `Reprogramado desde ${pending.originalDate}`
        };

        if (this.canReceiveStop(primary, stop)) {
          primary.stops.push(stop);
          placedDate = day.date;
          if (stop.type === 'colony' || stop.type === 'institution') {
            console.log(`[Scheduler] Reprogramado: "${stop.name}" (${stop.type}, ${Math.abs(stop.demand)} kg) de ${pending.originalDate} a ${day.date} (${pending.preferredTruck})`);
          }
          break;
        }
        if (this.canReceiveStop(secondary, stop)) {
          secondary.stops.push(stop);
          placedDate = day.date;
          if (stop.type === 'colony' || stop.type === 'institution') {
            console.log(`[Scheduler] Reprogramado: "${stop.name}" (${stop.type}, ${Math.abs(stop.demand)} kg) de ${pending.originalDate} a ${day.date} (${pending.preferredTruck === 'truckA' ? 'truckB' : 'truckA'} - Alternativo)`);
          }
          break;
        }
      }

      warnings.push({
        type: placedDate ? 'reprogrammed' : 'omitted',
        stopName: pending.stop.name || `Punto ${pending.stop.id}`,
        stopType: pending.stop.type,
        originalDate: pending.originalDate,
        newDate: placedDate,
        reason: placedDate
          ? `${pending.reason}. Se movió al siguiente día válido con capacidad.`
          : `${pending.reason}. No hubo otro día válido con capacidad dentro del mes.`
      });
    }

    plan.warnings = warnings;
    this.pendingStops = [];
  }

  // ─── Generación del Plan ──────────────────────────────────────────────────

  /**
   * Genera el plan mensual completo.
   * La función es async porque consulta la API de OSRM para cada día.
   */
  public async generate(): Promise<MonthlyPlan> {
    this.pendingStops = [];
    const plan: MonthlyPlan = {
      days: [],
      monthName: this.startDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
      warnings: []
    };

    const diffMs = this.endDate.getTime() - this.startDate.getTime();
    const numDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // Inicializar días del mes
    const sortedTrucks = [...this.trucks].sort((a, b) => (b.capacity_kg ?? 0) - (a.capacity_kg ?? 0));
    const usableUnitsCount = Math.min(this.trucks.length, this.drivers.length);
    const defaultTruckA = sortedTrucks[0];
    const defaultTruckB = usableUnitsCount >= 2 ? sortedTrucks[1] ?? sortedTrucks[0] : undefined;
    for (let i = 0; i < numDays; i++) {
      const d = new Date(this.startDate);
      d.setDate(this.startDate.getDate() + i);
      plan.days.push({
        date: d.toISOString().split('T')[0],
        truckA: {
          stops: [],
          truckCapacityKg: Number(defaultTruckA?.capacity_kg || DEFAULT_TRUCK_CAPACITY_KG)
        },
        truckB: {
          stops: [],
          truckCapacityKg: defaultTruckB ? Number(defaultTruckB.capacity_kg || DEFAULT_TRUCK_CAPACITY_KG) : 0
        }
      });
    }

    // 1. Asignación heurística de paradas por día y camión
    if (this.colonies.length > 0) this.scheduleColonies(plan);
    if (this.institutions.length > 0) this.scheduleInstitutions(plan);
    
    // Primera pasada: procesar y acomodar colonias e instituciones pendientes (que tienen prioridad)
    this.processPendingStops(plan);
    
    if (this.supermarkets.length > 0) this.scheduleSupermarkets(plan);
    
    // Segunda pasada: procesar supermercados u otras paradas que hayan quedado pendientes
    this.processPendingStops(plan);
    
    // Caridad se inserta de oportunidad DESPUÉS de todas las rutas y reprogramaciones base
    if (this.caridad.length > 0) this.insertCaridadOportunista(plan);

    // Balancear carga de trabajo diaria entre choferes (Driver Workload Equity)
    this.balanceDailyWorkloads(plan);

    // Garantía absoluta de límite de paradas por camión por día (Safety Net)
    for (const day of plan.days) {
      if (day.truckA.stops.length > this.maxStopsPerTruck) {
        console.log(`[Scheduler] Truncando ruta A del día ${day.date}: ${day.truckA.stops.length} -> ${this.maxStopsPerTruck}`);
        day.truckA.stops = day.truckA.stops.slice(0, this.maxStopsPerTruck);
      }
      if (day.truckB.stops.length > this.maxStopsPerTruck) {
        console.log(`[Scheduler] Truncando ruta B del día ${day.date}: ${day.truckB.stops.length} -> ${this.maxStopsPerTruck}`);
        day.truckB.stops = day.truckB.stops.slice(0, this.maxStopsPerTruck);
      }
    }

    this.assignDriversAndTrucks(plan);

    // 2. Optimización async con OSRM + GA + 2-opt por cada ruta del día
    await this.optimizeAllRoutes(plan);

    return plan;
  }

  // ─── Optimización de todas las rutas ─────────────────────────────────────

  private async optimizeAllRoutes(plan: MonthlyPlan): Promise<void> {
    for (const day of plan.days) {
      const dow = new Date(day.date + 'T12:00:00').getDay();
      if (dow === 0 || this.nonWorkingDays.includes(day.date)) continue;

      // Optimizar ambos camiones en paralelo
      await Promise.all([
        this.optimizeSingleRoute(day.truckA),
        this.optimizeSingleRoute(day.truckB)
      ]);
    }
  }

  private async optimizeSingleRoute(truck: TruckRoute): Promise<void> {
    if (truck.stops.length < 2) return;

    const collections = truck.stops.filter(s => s.demand > 0);
    const deliveries = truck.stops.filter(s => s.demand < 0);

    const warehouseStop: RouteStop = {
      id: 1, // El almacén central tiene ID 1 en la base de datos
      name: 'CEDIS BAMX (C. Iturbide 1407, San José, 88230 Nuevo Laredo)',
      type: 'warehouse',
      demand: 0,
      lat: this.cedisLat,
      lng: this.cedisLng,
      serviceTimeMinutes: this.avgUnloadingTime
    };

    let finalRouteStops: RouteStop[] = [];
    let totalDist = 0;
    let totalDuration = 0;
    let fromOSRM = true;
    let optimized = true;

    // Fase 1: Optimizar la Recolección (Supermercados)
    if (collections.length > 0) {
      const stopsForColl = [warehouseStop, ...collections];
      const geoPoints = stopsForColl.map(s => ({
        lat: s.lat ?? this.cedisLat,
        lng: s.lng ?? this.cedisLng,
        id: s.id,
        name: s.name
      }));
      const matrix = await getDistanceMatrix(geoPoints);
      
      const ga = new GeneticRouting({
        stops: stopsForColl,
        distances: matrix.distances,
        durations: matrix.durations,
        truckCapacity: this.getTruckCapacity(truck),
        numGenerations: this.gaConfig.numGenerations,
        popSize: this.gaConfig.popSize,
        mutationRate: this.gaConfig.mutationRate,
        startTime: this.openingTime
      });
      
      const result = ga.run();
      if (result.isValid) {
        // Filtrar el almacén del inicio y final de esta sub-ruta
        const intermediate = result.route.filter(s => s.type !== 'warehouse');
        finalRouteStops.push(...intermediate);
        totalDist += result.totalDistance;
        totalDuration += result.totalDurationMinutes;
        fromOSRM = fromOSRM && matrix.fromOSRM;
      } else {
        optimized = false;
      }
    }

    // Agregar retorno intermedio al CEDIS si hay ambas fases
    if (collections.length > 0 && deliveries.length > 0) {
      finalRouteStops.push({
        ...warehouseStop,
        name: 'CEDIS BAMX (Retorno para descarga/recarga)',
        serviceTimeMinutes: this.avgUnloadingTime
      });
    }

    // Fase 2: Optimizar la Distribución (Colonias, Instituciones, Beneficiarios)
    if (deliveries.length > 0) {
      const stopsForDeliv = [warehouseStop, ...deliveries];
      const geoPoints = stopsForDeliv.map(s => ({
        lat: s.lat ?? this.cedisLat,
        lng: s.lng ?? this.cedisLng,
        id: s.id,
        name: s.name
      }));
      const matrix = await getDistanceMatrix(geoPoints);

      // Calcular hora de inicio de la fase de distribución
      let deliveryStartTime = this.openingTime;
      if (collections.length > 0) {
        const startMin = this.timeToMinutes(this.openingTime) + totalDuration;
        deliveryStartTime = this.minutesToTime(startMin);
      }

      const ga = new GeneticRouting({
        stops: stopsForDeliv,
        distances: matrix.distances,
        durations: matrix.durations,
        truckCapacity: this.getTruckCapacity(truck),
        numGenerations: this.gaConfig.numGenerations,
        popSize: this.gaConfig.popSize,
        mutationRate: this.gaConfig.mutationRate,
        startTime: deliveryStartTime
      });

      const result = ga.run();
      if (result.isValid) {
        // Filtrar el almacén del inicio y final de esta sub-ruta
        const intermediate = result.route.filter(s => s.type !== 'warehouse');
        finalRouteStops.push(...intermediate);
        totalDist += result.totalDistance;
        totalDuration += result.totalDurationMinutes;
        fromOSRM = fromOSRM && matrix.fromOSRM;
      } else {
        optimized = false;
      }
    }

    if (finalRouteStops.length > 0) {
      truck.stops = finalRouteStops;
      truck.stats = {
        distanceKm: Math.round(totalDist * 10) / 10,
        durationMinutes: Math.round(totalDuration + this.avgUnloadingTime),
        optimized,
        fromOSRM
      };

      const limit = Math.min(
        this.minutesBetween(this.openingTime, this.closingTime),
        truck.driverMaxMinutes || Infinity
      );
      if (truck.stats.durationMinutes > limit) {
        truck.stats.optimized = false;
      }
    }
  }

  // ─── Asignación de Supermercados ──────────────────────────────────────────

  /**
   * Supermercados: se visitan diariamente de lunes a sábado.
   * Se agrupan por zona geográfica (norte/sur del centroide) para asignar
   * a cada camión de forma coherente geográficamente.
   */
  private scheduleSupermarkets(plan: MonthlyPlan): void {
    if (this.supermarkets.length === 0) return;

    const [zoneA, zoneB] = this.clusterByZone(this.supermarkets);

    plan.days.forEach(day => {
      const dow = new Date(day.date + 'T12:00:00').getDay();
      if (dow === 0 || this.nonWorkingDays.includes(day.date)) return;

      // Filtrar supermercados que corresponden al día según collection_days
      const daySupersA = zoneA
        .filter(s => this.matchesDayOfWeek(s.collection_days, dow))
        .sort((a, b) => Number(b.is_foreign || 0) - Number(a.is_foreign || 0));
      const daySupersB = zoneB
        .filter(s => this.matchesDayOfWeek(s.collection_days, dow))
        .sort((a, b) => Number(b.is_foreign || 0) - Number(a.is_foreign || 0));

      // Agregar paradas respetando el límite. Si el camión asignado está lleno,
      // intentar el otro; si ambos están llenos, omitir ese super para ese día.
      for (const s of daySupersA) {
        const stop = this.supermarketToStop(s);
        this.addStopOrQueue(day, 'truckA', stop, {
          allowedDays: s.collection_days,
          reason: 'No cupo en la ruta de recolección del día'
        });
      }
      for (const s of daySupersB) {
        const stop = this.supermarketToStop(s);
        this.addStopOrQueue(day, 'truckB', stop, {
          allowedDays: s.collection_days,
          reason: 'No cupo en la ruta de recolección del día'
        });
      }

      // Si un grupo quedó completamente vacío después del clustering, balancear
      if (day.truckA.stops.length === 0 && day.truckB.stops.length > 0) {
        const half = Math.floor(day.truckB.stops.length / 2);
        day.truckA.stops = day.truckB.stops.splice(0, half);
      } else if (day.truckB.stops.length === 0 && day.truckA.stops.length > 0) {
        const half = Math.floor(day.truckA.stops.length / 2);
        day.truckB.stops = day.truckA.stops.splice(0, half);
      }
    });
  }

  private supermarketToStop(s: any): RouteStop {
    return {
      id: s.id,
      name: s.name,
      type: 'supermarket',
      demand: s.avg_volume ?? 200,
      lat: s.lat,
      lng: s.lng,
      serviceTimeMinutes: Number(s.loading_time || 0) > 0
        ? Number(s.loading_time) + (s.is_foreign === 1 ? 20 : 0)
        : s.is_foreign === 1
          ? 55
          : 35
    };
  }

  // ─── Asignación de Instituciones ──────────────────────────────────────────

  /**
   * Instituciones: se visitan en su día fijo (fixed_day) semanal.
   * Se asignan al camión con menor carga acumulada ese día.
   */
  private scheduleInstitutions(plan: MonthlyPlan): void {
    this.institutions.forEach(inst => {
      plan.days.forEach(day => {
        const dow = new Date(day.date + 'T12:00:00').getDay();
        if (!this.matchesDayOfWeek(inst.fixed_day, dow)) return;
        if (this.nonWorkingDays.includes(day.date)) return;

        // Elegir el camión menos cargado que aún tenga capacidad
        const lighter = this.lighterTruck(day);
        const other = lighter === day.truckA ? day.truckB : day.truckA;

        const target = this.hasCapacity(lighter)
          ? lighter
          : this.hasCapacity(other)
            ? other
            : null;

        const stop: RouteStop = {
          id: inst.id,
          name: inst.name,
          type: 'institution',
          demand: -(inst.estimated_kg ?? 80),
          lat: inst.lat,
          lng: inst.lng,
          serviceTimeMinutes: Number(inst.delivery_time || 0) > 0 ? Number(inst.delivery_time) : 30
        };

        this.addStopOrQueue(day, target === day.truckB ? 'truckB' : 'truckA', stop, {
          allowedDays: inst.fixed_day,
          reason: 'No cupo en el día fijo de institución'
        });
      });
    });
  }

  // ─── Asignación de Colonias ───────────────────────────────────────────────

  /**
   * Colonias urbanas: 2 visitas al mes (primera y tercera semana).
   * Colonias rurales: 1 visita al mes (primer sábado disponible).
   * Se respeta preferred_day si está configurado.
   */
  private scheduleColonies(plan: MonthlyPlan): void {
    const urban = this.colonies
      .filter(c => c.type === 'Urbana')
      .sort((a, b) => Number(b.recovery_fee || 0) - Number(a.recovery_fee || 0));
    const rural = this.colonies
      .filter(c => c.type === 'Rural')
      .sort((a, b) => Number(b.recovery_fee || 0) - Number(a.recovery_fee || 0));

    // Colonias urbanas: agrupar por zona y distribuir en semanas 1 y 3
    const [zoneA, zoneB] = this.clusterByZone(urban);

    this.assignColonyVisits(plan, zoneA, 'truckA');
    this.assignColonyVisits(plan, zoneB, 'truckB');

    // Colonias rurales: primer sábado del mes
    const firstSaturday = plan.days.find(d => {
      const dow = new Date(d.date + 'T12:00:00').getDay();
      return dow === 6 && !this.nonWorkingDays.includes(d.date);
    });

    if (firstSaturday) {
      const target = this.lighterTruck(firstSaturday);
      rural.forEach(colony => {
        const stop = this.colonyToStop(colony);
        this.addStopOrQueue(firstSaturday, target === firstSaturday.truckB ? 'truckB' : 'truckA', stop, {
          allowedDays: 'Sabado',
          reason: 'No cupo en la visita rural programada'
        });
      });
    }
  }

  /**
   * Asigna las colonias de una zona al camión correspondiente en la semana dada.
   * Respeta preferred_day si está configurado en la colonia.
   */
  private assignColonyVisits(
    plan: MonthlyPlan,
    colonies: any[],
    truck: 'truckA' | 'truckB'
  ): void {
    colonies.forEach((colony, idx) => {
      const weeks = this.weeksForFrequency(colony.frequency, colony.type);
      weeks.forEach((weekNumber) => {
      // Calcular el día objetivo en el mes
      const baseOffset = (weekNumber - 1) * 7; // inicio de la semana
      const preferredDow = colony.preferred_day ? this.dayNameToIndex(colony.preferred_day) : 1;

      // Buscar el día de la semana correspondiente en la semana dada
      let targetDay: DailyRoster | undefined;
      for (const day of plan.days) {
        const date = new Date(day.date + 'T12:00:00');
        const dayOfMonth = date.getDate();
        const dow = date.getDay();
        if (
          dayOfMonth > baseOffset &&
          dayOfMonth <= baseOffset + 7 &&
          dow === (preferredDow === -1 ? ((idx % 5) + 1) : preferredDow) &&
          !this.nonWorkingDays.includes(day.date)
        ) {
          targetDay = day;
          break;
        }
      }

      // Si no encontró el día exacto, usar el primer día laboral de la semana
      if (!targetDay) {
        for (const day of plan.days) {
          const date = new Date(day.date + 'T12:00:00');
          const dayOfMonth = date.getDate();
          const dow = date.getDay();
          if (
            dayOfMonth > baseOffset &&
            dayOfMonth <= baseOffset + 7 &&
            dow !== 0 &&
            !this.nonWorkingDays.includes(day.date)
          ) {
            targetDay = day;
            break;
          }
        }
      }

      if (targetDay) {
        // Respetar el límite de paradas por camión
        const primaryTruck = targetDay[truck];
        const stop = this.colonyToStop(colony);
        this.addStopOrQueue(targetDay, primaryTruck === targetDay.truckB ? 'truckB' : 'truckA', stop, {
          allowedDays: colony.preferred_day || undefined,
          reason: 'No cupo en la semana/día preferido de colonia'
        });
      }
      });
    });
  }

  private colonyToStop(c: any): RouteStop {
    const pantryWeight = 15;
    return {
      id: c.id,
      name: c.name,
      type: 'colony',
      demand: -((c.pantry_count ?? 20) * pantryWeight),
      lat: c.lat,
      lng: c.lng,
      serviceTimeMinutes: Number(c.service_time || 0) > 0 ? Number(c.service_time) : 20
    };
  }

  // ─── Inserción Oportunista de Beneficiarios (Caridad) ────────────────────

  /**
   * Inserta beneficiarios de caridad en rutas existentes de forma oportunista:
   * solo cuando el camión pasa cerca Y todavía tiene capacidad disponible.
   *
   * Reglas:
   *  - El beneficiario debe estar a ≤ PROXIMITY_KM del punto más cercano de la ruta.
   *  - El camión no debe superar su capacidad total (TRUCK_CAPACITY_KG).
   *  - Cada beneficiario se visita como máximo 1 vez por semana calendario
   *    (se distribuyen naturalmente entre distintos días del mes).
   *  - Prioridad: días con más paradas ya asignadas (mayor probabilidad de paso cercano).
   */
  private insertCaridadOportunista(plan: MonthlyPlan): void {
    if (!this.caridad || this.caridad.length === 0) return;

    /** Radio máximo de proximidad para inserción oportunista (km) */
    const PROXIMITY_KM = 3.0;
    /** Peso de cada despensa de caridad (kg) */
    const DESPENSA_KG = 15;

    /**
     * Mapa semana-ISO → Set de IDs de beneficiarios ya visitados esa semana.
     * Previene visitar al mismo beneficiario más de una vez por semana.
     */
    const visitedThisWeek = new Map<string, Set<number>>();

    /** Devuelve la clave de semana ISO (año-semana) para una fecha YYYY-MM-DD */
    const weekKey = (dateStr: string): string => {
      const d = new Date(dateStr + 'T12:00:00');
      // ISO week: lunes=1, domingo=7
      const dayOfWeek = (d.getDay() + 6) % 7; // 0=lunes, 6=domingo
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - dayOfWeek);
      return `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}-${weekStart.getMonth()}`;
    };

    /**
     * Calcula la distancia Haversine mínima entre un punto y todos los stops de una ruta.
     * Devuelve Infinity si la ruta no tiene paradas.
     */
    const minDistToRoute = (lat: number, lng: number, stops: RouteStop[]): number => {
      if (stops.length === 0) return Infinity;
      let min = Infinity;
      for (const stop of stops) {
        if (stop.lat == null || stop.lng == null) continue;
        const dLat = ((stop.lat - lat) * Math.PI) / 180;
        const dLng = ((stop.lng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((stop.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const dist = 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (dist < min) min = dist;
      }
      return min;
    };

    /**
     * Calcula la carga acumulada actual de un camión (suma de demandas en valor absoluto
     * para las paradas de ENTREGA, que tienen demanda negativa).
     * Paradas de recolección (supermercados) suman positivo, entregas restan.
     * Para efectos de capacidad, usamos la carga MAX que se transportará.
     */
    const currentLoad = (stops: RouteStop[]): number => {
      let load = 0;
      let maxLoad = 0;
      for (const s of stops) {
        load += s.demand;
        if (load > maxLoad) maxLoad = load;
      }
      // Si no hay recolecciones, aproximamos la carga como el total de entregas
      if (maxLoad === 0) {
        maxLoad = stops.reduce((acc, s) => acc + Math.abs(s.demand), 0);
      }
      return maxLoad;
    };

    // Iterar por cada día del plan (de mayor a menor número de paradas
    // para priorizar días con rutas más densas donde habrá más probabilidad de paso)
    const sortedDays = [...plan.days].sort((a, b) => {
      const totalA = a.truckA.stops.length + a.truckB.stops.length;
      const totalB = b.truckA.stops.length + b.truckB.stops.length;
      return totalB - totalA;
    });

    for (const dayRef of sortedDays) {
      // Encontrar el día real en el plan (usamos la misma referencia de objeto)
      const day = plan.days.find(d => d.date === dayRef.date)!;
      const dow = new Date(day.date + 'T12:00:00').getDay();

      // No insertar en domingos ni días inhabiles ni días sin rutas
      if (dow === 0 || this.nonWorkingDays.includes(day.date)) continue;
      if (day.truckA.stops.length === 0 && day.truckB.stops.length === 0) continue;

      const wk = weekKey(day.date);
      if (!visitedThisWeek.has(wk)) visitedThisWeek.set(wk, new Set());
      const visitedSet = visitedThisWeek.get(wk)!;

      const beneficiaries = [...this.caridad].sort((a, b) => this.beneficiaryPriority(b) - this.beneficiaryPriority(a));

      for (const beneficiary of beneficiaries) {
        // Ya visitado esta semana → saltar
        if (visitedSet.has(beneficiary.id)) continue;
        if (this.isRestrictedForDay(beneficiary.restriction_day, dow)) continue;

        const bLat = beneficiary.lat ?? this.cedisLat;
        const bLng = beneficiary.lng ?? this.cedisLng;

        // Evaluar ambos camiones: elegir el que tenga menor distancia al beneficiario
        // y aún tenga capacidad disponible
        const trucks: Array<{ truck: TruckRoute; distKm: number; remainingKg: number }> = [];

        for (const truck of [day.truckA, day.truckB]) {
          if (truck.stops.length === 0) continue;
          if (!this.hasCapacity(truck)) continue; // Evitar exceder el límite de paradas diarias
          const dist = minDistToRoute(bLat, bLng, truck.stops);
          const usedKg = currentLoad(truck.stops);
          const remainingKg = this.getTruckCapacity(truck) - usedKg;
          if (dist <= PROXIMITY_KM && remainingKg >= DESPENSA_KG && this.canReceiveStop(truck, this.beneficiaryToStop(beneficiary))) {
            trucks.push({ truck, distKm: dist, remainingKg });
          }
        }

        if (trucks.length === 0) continue;

        // Elegir el camión más cercano al beneficiario con capacidad disponible
        trucks.sort((a, b) => a.distKm - b.distKm);
        const chosen = trucks[0].truck;

        chosen.stops.push(this.beneficiaryToStop(beneficiary));
        visitedSet.add(beneficiary.id);
      }
    }
  }

  private beneficiaryToStop(b: any): RouteStop {
    return {
      id: b.id,
      name: b.name,
      type: 'beneficiary',
      demand: -this.beneficiaryDemandKg(b),
      lat: b.lat ?? this.cedisLat,
      lng: b.lng ?? this.cedisLng,
      serviceTimeMinutes: Number(b.avg_delivery_time || 0) > 0 ? Number(b.avg_delivery_time) : 10
    };
  }

  // ─── Asignación de Choferes y Unidades ───────────────────────────────────

  private assignDriversAndTrucks(plan: MonthlyPlan): void {
    const activeTrucks = this.trucks;
    const activeDrivers = this.drivers;

    const availableUnitsCount = Math.min(activeTrucks.length, activeDrivers.length);

    if (availableUnitsCount === 0) {
      plan.days.forEach(day => {
        day.truckA.stops = [];
        day.truckB.stops = [];
        day.truckA.truckId = null;
        day.truckA.driverId = null;
        day.truckB.truckId = null;
        day.truckB.driverId = null;
      });
      return;
    }

    plan.days.forEach(day => {
      const dow = new Date(day.date + 'T12:00:00').getDay();
      const availableDrivers = activeDrivers.filter(driver => this.matchesDayOfWeek(driver.available_days, dow));
      const usableDrivers = availableDrivers.length > 0 ? availableDrivers : activeDrivers;
      const sortedTrucks = [...activeTrucks].sort((a, b) => (b.capacity_kg ?? 0) - (a.capacity_kg ?? 0));

      if (availableUnitsCount === 1 || usableDrivers.length === 1) {
        // Mover todas las paradas a truckA y truncar
        day.truckA.stops = [...day.truckA.stops, ...day.truckB.stops];
        day.truckB.stops = [];

        if (day.truckA.stops.length > this.maxStopsPerTruck) {
          day.truckA.stops = day.truckA.stops.slice(0, this.maxStopsPerTruck);
        }

        const activeTruck = sortedTrucks[0];
        const activeDriver = usableDrivers[0];
        day.truckA.truckId = activeTruck.id;
        day.truckA.truckCapacityKg = Number(activeTruck.capacity_kg || DEFAULT_TRUCK_CAPACITY_KG);
        day.truckA.driverId = activeDriver.id;
        day.truckA.driverMaxMinutes = Number(activeDriver.max_hours_per_day || 8) * 60;
        day.truckB.truckId = null;
        day.truckB.driverId = null;
        day.truckB.truckCapacityKg = 0;
        day.truckB.driverMaxMinutes = 0;
        return;
      }

      const truckA = sortedTrucks[0];
      const truckB = sortedTrucks[1] ?? sortedTrucks[0];

      const driverA = usableDrivers[0];
      const driverB = usableDrivers.find(d => d.id !== driverA?.id) ?? usableDrivers[0];
      day.truckA.truckId = truckA.id;
      day.truckA.truckCapacityKg = Number(truckA.capacity_kg || DEFAULT_TRUCK_CAPACITY_KG);
      day.truckA.driverId = driverA?.id;
      day.truckA.driverMaxMinutes = Number(driverA?.max_hours_per_day || 8) * 60;
      day.truckB.truckId = truckB.id;
      day.truckB.truckCapacityKg = Number(truckB.capacity_kg || DEFAULT_TRUCK_CAPACITY_KG);
      day.truckB.driverId = driverB?.id;
      day.truckB.driverMaxMinutes = Number(driverB?.max_hours_per_day || 8) * 60;
    });
  }

  // ─── Clustering geográfico (k-means simplificado) ────────────────────────

  /**
   * Divide una lista de puntos en 2 grupos por zona geográfica.
   * Usa la longitud (lng) del centroide como divisor: los más al este van al grupo A,
   * los más al oeste van al grupo B. Esto produce zonas coherentes en Nuevo Laredo.
   */
  private clusterByZone<T extends { lat?: number; lng?: number }>(items: T[]): [T[], T[]] {
    if (items.length === 0) return [[], []];
    if (items.length === 1) return [items, []];

    // Calcular centroide
    const validItems = items.filter(it => it.lat != null && it.lng != null);
    if (validItems.length === 0) {
      // Si no hay coordenadas, dividir en mitades
      const mid = Math.ceil(items.length / 2);
      return [items.slice(0, mid), items.slice(mid)];
    }

    const avgLng = validItems.reduce((acc, it) => acc + (it.lng as number), 0) / validItems.length;

    const zoneA: T[] = []; // Este (lng > avgLng)
    const zoneB: T[] = []; // Oeste (lng <= avgLng)

    items.forEach(it => {
      if ((it.lng ?? avgLng) >= avgLng) {
        zoneA.push(it);
      } else {
        zoneB.push(it);
      }
    });

    // Balancear si una zona quedó muy vacía
    if (zoneA.length === 0) {
      const half = Math.ceil(zoneB.length / 2);
      return [zoneB.slice(0, half), zoneB.slice(half)];
    }
    if (zoneB.length === 0) {
      const half = Math.ceil(zoneA.length / 2);
      return [zoneA.slice(0, half), zoneA.slice(half)];
    }

    return [zoneA, zoneB];
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Retorna el camión con menor carga acumulada en el día (prioriza menor cantidad de paradas). */
  private lighterTruck(day: DailyRoster): TruckRoute {
    const stopsA = day.truckA.stops.length;
    const stopsB = day.truckB.stops.length;
    if (stopsA !== stopsB) {
      return stopsA < stopsB ? day.truckA : day.truckB;
    }
    const loadA = day.truckA.stops.reduce((acc, s) => acc + Math.abs(s.demand), 0);
    const loadB = day.truckB.stops.reduce((acc, s) => acc + Math.abs(s.demand), 0);
    return loadA <= loadB ? day.truckA : day.truckB;
  }

  /** Balancea la cantidad de paradas de forma equitativa entre ambos camiones de cada día. */
  private balanceDailyWorkloads(plan: MonthlyPlan): void {
    for (const day of plan.days) {
      let stopsA = day.truckA.stops;
      let stopsB = day.truckB.stops;

      while (Math.abs(stopsA.length - stopsB.length) > 1) {
        const busier = stopsA.length > stopsB.length ? day.truckA : day.truckB;
        const lighter = busier === day.truckA ? day.truckB : day.truckA;

        let moved = false;
        for (let i = busier.stops.length - 1; i >= 0; i--) {
          const stop = busier.stops[i];
          if (stop.type === 'warehouse') continue;

          if (this.canReceiveStop(lighter, stop)) {
            busier.stops.splice(i, 1);
            lighter.stops.push(stop);
            moved = true;
            break;
          }
        }

        if (!moved) break;

        stopsA = day.truckA.stops;
        stopsB = day.truckB.stops;
      }
    }
  }

  private dayHasStop(day: DailyRoster, stop: RouteStop): boolean {
    return [...day.truckA.stops, ...day.truckB.stops].some(existing => {
      return existing.id === stop.id && existing.type === stop.type;
    });
  }

  private weeksForFrequency(frequency: string | null | undefined, type?: string): Array<1 | 2 | 3 | 4> {
    const normalized = this.normalizeText(frequency || '');

    if (normalized.includes('semanal') && !normalized.includes('quincenal')) return [1, 2, 3, 4];
    if (normalized.includes('quincenal') || normalized.includes('15')) return [1, 3];
    if (normalized.includes('mensual') || normalized.includes('mes')) return [1];
    if (normalized.includes('bimestral')) return [1];

    return type === 'Rural' ? [1] : [1, 3];
  }

  private isRestrictedForDay(dayString: string | null | undefined, targetDow: number): boolean {
    if (!dayString) return false;
    const normalized = this.normalizeText(dayString);
    if (!normalized || normalized === 'ninguna' || normalized === 'sinrestriccion') return false;
    return this.matchesDayOfWeek(dayString, targetDow);
  }

  private beneficiaryPriority(beneficiary: any): number {
    const normalized = this.normalizeText(beneficiary.pb || '');
    if (!normalized) return 0;
    if (normalized.includes('alta') || normalized === '1' || normalized.includes('prioridad1')) return 3;
    if (normalized.includes('media') || normalized === '2' || normalized.includes('prioridad2')) return 2;
    if (normalized.includes('baja') || normalized === '3' || normalized.includes('prioridad3')) return 1;
    return 1;
  }

  private beneficiaryDemandKg(beneficiary: any): number {
    const normalized = this.normalizeText(beneficiary.pb || '');
    if (normalized.includes('doble')) return 30;
    return 15;
  }

  private minutesBetween(start: string, end: string): number {
    const startMinutes = this.timeToMinutes(start || DEFAULT_START_TIME);
    let endMinutes = this.timeToMinutes(end || DEFAULT_END_TIME);
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    return endMinutes - startMinutes;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (Number.isFinite(hours) ? hours : 7) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.round(minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  }

  /**
   * Verifica si un string de días (ej: "Lunes-Sabado", "Miercoles, Viernes")
   * incluye el día de la semana indicado (0=Dom, 1=Lun, ... 6=Sab).
   */
  private matchesDayOfWeek(dayString: string | null | undefined, targetDow: number): boolean {
    if (!dayString) return true; // Si no tiene restricción, aplica todos los días
    const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const target = DAYS[targetDow];

    const normalized = this.normalizeText(dayString);

    const parts = normalized.split(',');
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const si = DAYS.indexOf(startStr);
        const ei = DAYS.indexOf(endStr);
        if (si !== -1 && ei !== -1) {
          if (si <= ei) {
            if (targetDow >= si && targetDow <= ei) return true;
          } else {
            if (targetDow >= si || targetDow <= ei) return true;
          }
        }
      } else if (part === target) {
        return true;
      }
    }
    return false;
  }

  /**
   * Convierte nombre de día a índice 0-6 (domingo=0).
   * Retorna -1 si no se reconoce.
   */
  private dayNameToIndex(dayName: string | null | undefined): number {
    if (!dayName) return -1;
    const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const normalized = this.normalizeText(dayName);
    return DAYS.findIndex(d => normalized.includes(d));
  }
}
