// monthlyScheduler.ts
import { RouteStop, GeneticRouting } from './geneticRouting';

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
  driverId?: number;
  truckId?: number;
  stats?: {
    distance: number;
    optimized: boolean;
  };
}

export class MonthlyScheduler {
  private startDate: Date;
  private endDate: Date;
  private colonies: any[];
  private supermarkets: any[];
  private institutions: any[];
  private caridad: any[];
  private trucks: any[];
  private drivers: any[];
  private gaConfig: {
    popSize: number;
    numGenerations: number;
    mutationRate: number;
  };
  private nonWorkingDays: string[]; // Formato YYYY-MM-DD

  constructor(config: {
    startDate?: string;
    colonies: any[];
    supermarkets: any[];
    institutions: any[];
    caridad: any[];
    trucks: any[];
    drivers: any[];
    gaConfig?: {
      popSize?: number;
      numGenerations?: number;
      mutationRate?: number;
    };
    nonWorkingDays?: string[];
  }) {
    // Definir el rango del mes solicitado
    if (config.startDate) {
      const parts = config.startDate.split('-').map(p => parseInt(p));
      this.startDate = new Date(parts[0], parts[1] - 1, 1);
    } else {
      const now = new Date();
      this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    this.endDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth() + 1, 0);

    this.colonies = config.colonies;
    this.supermarkets = config.supermarkets;
    this.institutions = config.institutions;
    this.caridad = config.caridad;
    this.trucks = config.trucks;
    this.drivers = config.drivers;
    
    // Configuracion por defecto para el algoritmo genetico (Aumentada para mayor precision)
    this.gaConfig = {
      popSize: config.gaConfig?.popSize || 200,
      numGenerations: config.gaConfig?.numGenerations || 1000,
      mutationRate: config.gaConfig?.mutationRate || 0.05
    };

    this.nonWorkingDays = config.nonWorkingDays || [];
  }

  /**
   * Genera el plan completo para el mes.
   */
  public generate(): MonthlyPlan {
    const plan: MonthlyPlan = { 
      days: [],
      monthName: this.startDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
    };
    
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    const numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Inicializar cada dia del mes
    for (let i = 0; i < numDays; i++) {
      const currentDate = new Date(this.startDate);
      currentDate.setDate(this.startDate.getDate() + i);
      plan.days.push({
        date: currentDate.toISOString().split('T')[0],
        truckA: { stops: [] },
        truckB: { stops: [] }
      });
    }

    // 1. Asignacion Heuristica: Distribuye puntos segun reglas fijas
    if (this.supermarkets.length > 0) this.scheduleSupermarkets(plan);
    if (this.colonies.length > 0) this.scheduleColonies(plan);
    if (this.caridad.length > 0) this.scheduleCaridad(plan);
    if (this.institutions.length > 0) this.scheduleInstitutions(plan);
    
    this.assignDriversAndTrucks(plan);

    // 2. Optimizacion: Mejora el orden de las rutas diarias con el algoritmo genetico
    this.optimizeAllRoutes(plan);

    return plan;
  }

  /**
   * Ejecuta la optimizacion para todas las rutas generadas.
   */
  private optimizeAllRoutes(plan: MonthlyPlan) {
    plan.days.forEach(day => {
      // No optimizar en dias de descanso o domingos
      if (this.nonWorkingDays.includes(day.date)) return;
      
      this.optimizeSingleRoute(day.truckA);
      this.optimizeSingleRoute(day.truckB);
    });
  }

  /**
   * Optimiza una ruta especifica si tiene suficientes paradas.
   */
  private optimizeSingleRoute(truckRoute: TruckRoute) {
    if (truckRoute.stops.length < 3) return;

    // Se define el banco de alimentos como punto de inicio y fin
    const warehouse: RouteStop = {
      id: 0,
      name: 'CEDIS BAMX (C. Iturbide 1407)',
      type: 'warehouse',
      demand: 0,
      lat: 27.4778508, 
      lng: -99.4949839
    };

    const stopsForGA = [warehouse, ...truckRoute.stops];
    const distances = this.calculateDistanceMatrix(stopsForGA);

    const ga = new GeneticRouting({
      stops: stopsForGA,
      distances: distances,
      truckCapacity: 3000, 
      numGenerations: this.gaConfig.numGenerations,
      popSize: this.gaConfig.popSize,
      mutationRate: this.gaConfig.mutationRate
    });

    const result = ga.run();
    if (result.isValid) {
      // Actualizar la ruta con la secuencia optimizada
      truckRoute.stops = result.route.filter(s => s.type !== 'warehouse');
      truckRoute.stats = {
        distance: result.totalDistance,
        optimized: true
      };
    }
  }

  /**
   * Calcula la matriz de distancias entre las paradas (Euclidiana aproximada).
   */
  private calculateDistanceMatrix(stops: RouteStop[]): number[][] {
    const matrix: number[][] = [];
    const baseLat = 27.4778508; 
    const baseLng = -99.4949839;

    for (let i = 0; i < stops.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < stops.length; j++) {
            if (i === j) {
                matrix[i][j] = 0;
            } else {
                const s1 = stops[i];
                const s2 = stops[j];
                
                const lat1 = s1.lat || baseLat;
                const lng1 = s1.lng || baseLng;
                const lat2 = s2.lat || baseLat;
                const lng2 = s2.lng || baseLng;

                // 1 grado equivale aproximadamente a 111km
                matrix[i][j] = Math.sqrt(
                    Math.pow(lat1 - lat2, 2) + 
                    Math.pow(lng1 - lng2, 2)
                ) * 111;
            }
        }
    }
    return matrix;
  }

  /**
   * Asigna la recoleccion en supermercados (diaria de lunes a sabado).
   */
  private scheduleSupermarkets(plan: MonthlyPlan) {
    plan.days.forEach(day => {
      const dateObj = new Date(day.date + 'T12:00:00');
      // No asignar en domingos o dias inhabiles
      if (dateObj.getDay() === 0 || this.nonWorkingDays.includes(day.date)) return; 

      this.supermarkets.forEach((s, index) => {
        // Alternar supermercados entre los dos camiones
        const targetTruck = index % 2 === 0 ? day.truckA : day.truckB;
        targetTruck.stops.push({
          id: s.id,
          name: s.name,
          type: 'supermarket',
          demand: s.avg_volume || 0,
          lat: s.lat,
          lng: s.lng
        });
      });
    });
  }

  /**
   * Planifica las visitas a colonias segun su tipo (Urbana/Rural) y frecuencia.
   */
  private scheduleColonies(plan: MonthlyPlan) {
    const urbanColonies = this.colonies.filter(c => c.type === 'Urbana');
    const ruralColonies = this.colonies.filter(c => c.type === 'Rural');

    // Colonias urbanas se visitan dos veces al mes
    urbanColonies.forEach((colony, index) => {
      const startDayOffset = (index * 2) % 12; 
      
      this.addColonyToDays(plan, colony, startDayOffset, 2);
      this.addColonyToDays(plan, colony, startDayOffset + 14, 2);
    });

    // Colonias rurales se visitan un sabado a mitad de mes
    ruralColonies.forEach((colony) => {
        this.addColonyToDays(plan, colony, 13, 1);
    });
  }

  /**
   * Agrega una colonia a dias especificos del plan.
   */
  private addColonyToDays(plan: MonthlyPlan, colony: any, startDayIndex: number, duration: number) {
    for (let i = 0; i < duration; i++) {
      const targetIndex = startDayIndex + i;
      if (targetIndex < plan.days.length) {
        const day = plan.days[targetIndex];
        const dateObj = new Date(day.date + 'T12:00:00');
        // Respetar domingos y descansos
        if (dateObj.getDay() === 0 || this.nonWorkingDays.includes(day.date)) continue;

        // Balancear carga entre camiones
        const targetTruck = day.truckB.stops.length < day.truckA.stops.length ? day.truckB : day.truckA;
        
        // Peso promedio: 8kg abarrotes + 7kg fruta = 15kg por despensa
        const pantryWeight = 15;
        
        targetTruck.stops.push({
          id: colony.id,
          name: colony.name,
          type: 'colony',
          demand: -(colony.pantry_count * pantryWeight),
          lat: colony.lat,
          lng: colony.lng
        });
      }
    }
  }

  /**
   * Distribuye los beneficiarios de caridad durante las semanas laborales.
   */
  private scheduleCaridad(plan: MonthlyPlan) {
    if (!this.caridad || this.caridad.length === 0) return;
    
    // Identificar el segundo miercoles y el cuarto miercoles (cada 15 dias aprox)
    const wednesdays: number[] = [];
    plan.days.forEach((day, index) => {
      const date = new Date(day.date + 'T12:00:00');
      if (date.getDay() === 3) { // 3 = Miercoles
        wednesdays.push(index);
      }
    });

    // Usar el segundo miercoles (mas cercano a la quincena) y el cuarto
    const targetWednesdays = [wednesdays[1], wednesdays[3]].filter(idx => idx !== undefined);

    targetWednesdays.forEach(dayIndex => {
      const day = plan.days[dayIndex];
      if (this.nonWorkingDays.includes(day.date)) return;

      this.caridad.forEach((b, index) => {
        // Balancear caridad entre camiones
        const targetTruck = index % 2 === 0 ? day.truckA : day.truckB;
        targetTruck.stops.push({
          id: b.id,
          name: b.name,
          type: 'beneficiary',
          demand: -15, // 1 despensa = 15kg promedio
          lat: b.lat || 0,
          lng: b.lng || 0
        });
      });
    });
  }

  /**
   * Planifica entregas en instituciones segun su dia fijo asignado.
   */
  private scheduleInstitutions(plan: MonthlyPlan) {
      this.institutions.forEach(inst => {
          const targetDow = this.mapDayOfWeek(inst.fixed_day);
          plan.days.forEach(day => {
              const dateObj = new Date(day.date + 'T12:00:00');
              if (dateObj.getDay() === targetDow && !this.nonWorkingDays.includes(day.date)) {
                  const targetTruck = day.truckB.stops.length < day.truckA.stops.length ? day.truckB : day.truckA;
                  
                  // Promedio Institucion: 40-120kg -> 80kg promedio
                  const instWeight = inst.estimated_kg || 80;

                  targetTruck.stops.push({
                      id: inst.id,
                      name: inst.name,
                      type: 'institution',
                      demand: -instWeight,
                      lat: inst.lat,
                      lng: inst.lng
                  });
              }
          });
      });
  }

  /**
   * Convierte nombres de dias de la semana a indices numericos.
   */
  private mapDayOfWeek(dayName: string): number {
      const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const index = days.findIndex(d => dayName.toLowerCase().includes(d));
      return index === -1 ? 1 : index;
  }

  /**
   * Asigna conductores y vehiculos fijos a las rutas diarias.
   */
  private assignDriversAndTrucks(plan: MonthlyPlan) {
    const juan = this.drivers.find(d => d.name.toLowerCase().includes('juan'));
    const trucksSorted = [...this.trucks].sort((a, b) => b.capacity_kg - a.capacity_kg);
    const largeTruck = trucksSorted[0];
    const otherTruck = this.trucks.find(t => t.id !== largeTruck.id) || this.trucks[0];
    const otherDriver = this.drivers.find(d => d.id !== juan?.id) || this.drivers[0];

    plan.days.forEach(day => {
        day.truckA.truckId = largeTruck.id;
        day.truckA.driverId = juan?.id;
        day.truckB.truckId = otherTruck.id;
        day.truckB.driverId = otherDriver.id;
    });
  }
}
