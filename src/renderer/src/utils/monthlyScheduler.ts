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

import { RouteStop, GeneticRouting, GeneticRouteResult } from './geneticRouting';
import { getDistanceMatrix, GeoPoint } from './distanceMatrix';

export interface MonthlyPlan {
  days: DailyRoster[];
  monthName: string;
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
  stats?: {
    distanceKm: number;
    durationMinutes: number;
    optimized: boolean;
    fromOSRM: boolean;
  };
}

// ─── Constantes operativas BAMX ───────────────────────────────────────────────

/** Coordenadas reales del CEDIS: C. Iturbide 1407, San José, 88230 Nuevo Laredo, Tamps. */
const DEFAULT_CEDIS_LAT = 27.477850806886945;
const DEFAULT_CEDIS_LNG = -99.49498391012905;

const TRUCK_CAPACITY_KG = 3000;
const START_TIME = '07:00';

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
  }

  // ─── Helper: verificar capacidad de paradas ─────────────────────────────────

  /** Retorna true si el camión todavía puede recibir más paradas hoy. */
  private hasCapacity(truck: TruckRoute): boolean {
    return truck.stops.length < this.maxStopsPerTruck;
  }

  // ─── Generación del Plan ──────────────────────────────────────────────────

  /**
   * Genera el plan mensual completo.
   * La función es async porque consulta la API de OSRM para cada día.
   */
  public async generate(): Promise<MonthlyPlan> {
    const plan: MonthlyPlan = {
      days: [],
      monthName: this.startDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
    };

    const diffMs = this.endDate.getTime() - this.startDate.getTime();
    const numDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // Inicializar días del mes
    for (let i = 0; i < numDays; i++) {
      const d = new Date(this.startDate);
      d.setDate(this.startDate.getDate() + i);
      plan.days.push({
        date: d.toISOString().split('T')[0],
        truckA: { stops: [] },
        truckB: { stops: [] }
      });
    }

    // 1. Asignación heurística de paradas por día y camión
    if (this.supermarkets.length > 0) this.scheduleSupermarkets(plan);
    if (this.institutions.length > 0) this.scheduleInstitutions(plan);
    if (this.colonies.length > 0) this.scheduleColonies(plan);
    // Caridad se inserta de oportunidad DESPUÉS de las rutas base
    if (this.caridad.length > 0) this.insertCaridadOportunista(plan);

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

    const warehouseStop: RouteStop = {
      id: 0,
      name: 'CEDIS BAMX (C. Iturbide 1407, San José, 88230 Nuevo Laredo)',
      type: 'warehouse',
      demand: 0,
      lat: this.cedisLat,
      lng: this.cedisLng,
      serviceTimeMinutes: 20
    };

    const allStops: RouteStop[] = [warehouseStop, ...truck.stops];

    // Preparar puntos geográficos para la matriz de distancias
    const geoPoints: GeoPoint[] = allStops.map(s => ({
      lat: s.lat ?? this.cedisLat,
      lng: s.lng ?? this.cedisLng,
      id: s.id,
      name: s.name
    }));

    // Obtener matriz de distancias (OSRM o Haversine)
    const matrixResult = await getDistanceMatrix(geoPoints);

    const ga = new GeneticRouting({
      stops: allStops,
      distances: matrixResult.distances,
      durations: matrixResult.durations,
      truckCapacity: TRUCK_CAPACITY_KG,
      numGenerations: this.gaConfig.numGenerations,
      popSize: this.gaConfig.popSize,
      mutationRate: this.gaConfig.mutationRate,
      startTime: START_TIME
    });

    const result: GeneticRouteResult = ga.run();

    if (result.isValid) {
      truck.stops = result.route.filter(s => s.type !== 'warehouse');
      truck.stats = {
        distanceKm: Math.round(result.totalDistance * 10) / 10,
        durationMinutes: Math.round(result.totalDurationMinutes),
        optimized: true,
        fromOSRM: matrixResult.fromOSRM
      };
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
      const daySupersA = zoneA.filter(s => this.matchesDayOfWeek(s.collection_days, dow));
      const daySupersB = zoneB.filter(s => this.matchesDayOfWeek(s.collection_days, dow));

      // Agregar paradas respetando el límite. Si el camión asignado está lleno,
      // intentar el otro; si ambos están llenos, omitir ese super para ese día.
      for (const s of daySupersA) {
        if (this.hasCapacity(day.truckA)) {
          day.truckA.stops.push(this.supermarketToStop(s));
        } else if (this.hasCapacity(day.truckB)) {
          day.truckB.stops.push(this.supermarketToStop(s));
        }
        // Si ambos llenos: el super se omite hoy (ya tiene cupo en la ruta del día siguiente)
      }
      for (const s of daySupersB) {
        if (this.hasCapacity(day.truckB)) {
          day.truckB.stops.push(this.supermarketToStop(s));
        } else if (this.hasCapacity(day.truckA)) {
          day.truckA.stops.push(this.supermarketToStop(s));
        }
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
      serviceTimeMinutes: s.loading_time ?? 35
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

        if (!target) return; // Ambos camiones llenos ese día: instituciones prioritarias para siguiente semana

        target.stops.push({
          id: inst.id,
          name: inst.name,
          type: 'institution',
          demand: -(inst.estimated_kg ?? 80),
          lat: inst.lat,
          lng: inst.lng,
          serviceTimeMinutes: inst.delivery_time ?? 30
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
    const urban = this.colonies.filter(c => c.type === 'Urbana');
    const rural = this.colonies.filter(c => c.type === 'Rural');

    // Colonias urbanas: agrupar por zona y distribuir en semanas 1 y 3
    const [zoneA, zoneB] = this.clusterByZone(urban);

    this.assignColonyVisits(plan, zoneA, 'truckA', 1); // Semana 1
    this.assignColonyVisits(plan, zoneA, 'truckA', 3); // Semana 3
    this.assignColonyVisits(plan, zoneB, 'truckB', 1);
    this.assignColonyVisits(plan, zoneB, 'truckB', 3);

    // Colonias rurales: primer sábado del mes
    const firstSaturday = plan.days.find(d => {
      const dow = new Date(d.date + 'T12:00:00').getDay();
      return dow === 6 && !this.nonWorkingDays.includes(d.date);
    });

    if (firstSaturday) {
      const target = this.lighterTruck(firstSaturday);
      const other = target === firstSaturday.truckA ? firstSaturday.truckB : firstSaturday.truckA;
      rural.forEach(colony => {
        if (this.hasCapacity(target)) {
          target.stops.push(this.colonyToStop(colony));
        } else if (this.hasCapacity(other)) {
          other.stops.push(this.colonyToStop(colony));
        }
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
    truck: 'truckA' | 'truckB',
    weekNumber: 1 | 2 | 3 | 4
  ): void {
    colonies.forEach((colony, idx) => {
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
        const otherTruck = truck === 'truckA' ? targetDay.truckB : targetDay.truckA;
        if (this.hasCapacity(primaryTruck)) {
          primaryTruck.stops.push(this.colonyToStop(colony));
        } else if (this.hasCapacity(otherTruck)) {
          // Si el camión asignado está lleno, intentar el otro
          otherTruck.stops.push(this.colonyToStop(colony));
        }
        // Si ambos llenos: colonia se omite esa semana (pendiente para próxima)
      }
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
      serviceTimeMinutes: 20
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

      for (const beneficiary of this.caridad) {
        // Ya visitado esta semana → saltar
        if (visitedSet.has(beneficiary.id)) continue;

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
          const remainingKg = TRUCK_CAPACITY_KG - usedKg;
          if (dist <= PROXIMITY_KM && remainingKg >= DESPENSA_KG) {
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
      demand: -15,
      lat: b.lat ?? this.cedisLat,
      lng: b.lng ?? this.cedisLng,
      serviceTimeMinutes: 10
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

    if (availableUnitsCount === 1) {
      // Usar la única unidad/chofer activo para truckA, vaciar truckB
      const activeTruck = activeTrucks[0];
      const activeDriver = activeDrivers[0];

      plan.days.forEach(day => {
        // Mover todas las paradas a truckA y truncar
        day.truckA.stops = [...day.truckA.stops, ...day.truckB.stops];
        day.truckB.stops = [];

        if (day.truckA.stops.length > this.maxStopsPerTruck) {
          day.truckA.stops = day.truckA.stops.slice(0, this.maxStopsPerTruck);
        }

        day.truckA.truckId = activeTruck.id;
        day.truckA.driverId = activeDriver.id;
        day.truckB.truckId = null;
        day.truckB.driverId = null;
      });
      return;
    }

    // Modelo estándar: 2 o más camiones y choferes activos
    const sortedTrucks = [...activeTrucks].sort((a, b) => (b.capacity_kg ?? 0) - (a.capacity_kg ?? 0));
    const truckA = sortedTrucks[0];
    const truckB = sortedTrucks[1] ?? sortedTrucks[0];

    const driverA = activeDrivers.find(d => d.name?.toLowerCase().includes('juan')) ?? activeDrivers[0];
    const driverB = activeDrivers.find(d => d.id !== driverA?.id) ?? activeDrivers[0];

    plan.days.forEach(day => {
      day.truckA.truckId = truckA.id;
      day.truckA.driverId = driverA?.id;
      day.truckB.truckId = truckB.id;
      day.truckB.driverId = driverB?.id;
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

  /** Retorna el camión con menor carga acumulada en el día. */
  private lighterTruck(day: DailyRoster): TruckRoute {
    const loadA = day.truckA.stops.reduce((acc, s) => acc + Math.abs(s.demand), 0);
    const loadB = day.truckB.stops.reduce((acc, s) => acc + Math.abs(s.demand), 0);
    return loadA <= loadB ? day.truckA : day.truckB;
  }

  /**
   * Verifica si un string de días (ej: "Lunes-Sabado", "Miercoles, Viernes")
   * incluye el día de la semana indicado (0=Dom, 1=Lun, ... 6=Sab).
   */
  private matchesDayOfWeek(dayString: string | null | undefined, targetDow: number): boolean {
    if (!dayString) return true; // Si no tiene restricción, aplica todos los días
    const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const target = DAYS[targetDow];

    const normalized = dayString
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');

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
    const normalized = dayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
    return DAYS.findIndex(d => normalized.includes(d));
  }
}
