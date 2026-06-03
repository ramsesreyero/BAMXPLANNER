/**
 * geneticRouting.ts
 *
 * Algoritmo Genético mejorado para optimización de rutas (Travelling Salesman Problem).
 *
 * Mejoras respecto a la versión anterior:
 *  1. Inicialización con Nearest Neighbor (greedy) para un buen punto de partida.
 *  2. Elitismo ampliado: top-3 individuos se preservan entre generaciones.
 *  3. Mutación adaptativa: si no hay mejora en N generaciones, aumenta la tasa.
 *  4. Post-optimización 2-opt: refinamiento local exhaustivo del mejor resultado del GA.
 *  5. Soporte de tiempos estimados por parada (modelo temporal).
 */

export interface RouteStop {
  id: number;
  name?: string;
  type: 'warehouse' | 'supermarket' | 'colony' | 'institution' | 'beneficiary';
  /** Kilos: positivo = recolección, negativo = entrega */
  demand: number;
  lat?: number;
  lng?: number;
  /** Tiempo de servicio en la parada (minutos): carga/descarga */
  serviceTimeMinutes?: number;
  // -- Campos de cronograma calculados --
  /** Hora estimada de llegada en formato "HH:MM" */
  estimatedArrival?: string;
  /** Hora estimada de salida en formato "HH:MM" */
  estimatedDeparture?: string;
  /** Minutos de tránsito desde la parada anterior */
  transitMinutes?: number;
}

export interface GeneticRouteResult {
  /** Secuencia final de la ruta (incluyendo almacén al inicio y al final) */
  route: RouteStop[];
  /** Distancia total en km */
  totalDistance: number;
  /** Duración total estimada en minutos */
  totalDurationMinutes: number;
  /** Valor de aptitud (inverso al costo) */
  fitness: number;
  /** Si la ruta cumple con la capacidad y reglas */
  isValid: boolean;
}

export interface GeneticAlgorithmConfig {
  stops: RouteStop[];
  /** Matriz de distancias en km [i][j] */
  distances: number[][];
  /** Matriz de duraciones en minutos [i][j] */
  durations: number[][];
  truckCapacity: number;
  popSize?: number;
  numGenerations?: number;
  mutationRate?: number;
  /** Hora de inicio del turno en formato "HH:MM" (default "07:00") */
  startTime?: string;
  /** Velocidad urbana en km/h para fallback (default 35) */
  urbanSpeedKmh?: number;
}

interface Individual {
  sequence: number[]; // Índices en el arreglo 'stops'
  fitness: number;
  totalDistance: number;
  totalDuration: number;
  isValid: boolean;
}

// ─── Utilidades de tiempo ─────────────────────────────────────────────────────

/** Convierte "HH:MM" a minutos desde medianoche */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convierte minutos desde medianoche a "HH:MM" */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─── Clase Principal ──────────────────────────────────────────────────────────

export class GeneticRouting {
  private stops: RouteStop[];
  private distances: number[][];
  private durations: number[][];
  private truckCapacity: number;
  private popSize: number;
  private numGenerations: number;
  private mutationRate: number;
  private startTimeMinutes: number;
  private warehouseIndex: number;

  constructor(config: GeneticAlgorithmConfig) {
    this.stops = config.stops;
    this.distances = config.distances;
    this.durations = config.durations;
    this.truckCapacity = config.truckCapacity;
    this.popSize = config.popSize ?? 120;
    this.numGenerations = config.numGenerations ?? 600;
    this.mutationRate = config.mutationRate ?? 0.05;
    this.startTimeMinutes = timeToMinutes(config.startTime ?? '07:00');
    this.warehouseIndex = this.stops.findIndex(s => s.type === 'warehouse');
    if (this.warehouseIndex === -1) this.warehouseIndex = 0;
  }

  // ─── Fitness ───────────────────────────────────────────────────────────────

  private calculateFitness(ind: Individual): void {
    let totalDistance = 0;
    let totalDuration = 0;
    let currentLoad = 0;
    let capacityPenalty = 0;

    for (let j = 1; j < ind.sequence.length; j++) {
      const prev = ind.sequence[j - 1];
      const curr = ind.sequence[j];
      const stop = this.stops[curr];

      totalDistance += this.distances[prev][curr];
      totalDuration += this.durations[prev][curr] + (stop.serviceTimeMinutes ?? 15);
      currentLoad += stop.demand;

      if (currentLoad > this.truckCapacity) capacityPenalty += 8000;
      if (currentLoad < 0) capacityPenalty += 8000;
    }

    ind.totalDistance = totalDistance;
    ind.totalDuration = totalDuration;
    ind.isValid = capacityPenalty === 0 && currentLoad >= 0;

    const totalCost = totalDistance + capacityPenalty;
    ind.fitness = 1.0 / (totalCost + 1);
  }

  // ─── Nearest Neighbor (inicialización greedy) ──────────────────────────────

  /**
   * Construye una ruta usando el algoritmo del vecino más cercano partiendo del almacén.
   * Produce un individuo que ya es competitivo como punto de partida para el GA.
   */
  private nearestNeighborIndividual(): Individual {
    const wi = this.warehouseIndex;
    const candidates = new Set<number>();
    for (let i = 0; i < this.stops.length; i++) {
      if (i !== wi) candidates.add(i);
    }

    const sequence: number[] = [wi];
    let current = wi;

    while (candidates.size > 0) {
      let best = -1;
      let bestDist = Infinity;
      for (const c of candidates) {
        if (this.distances[current][c] < bestDist) {
          bestDist = this.distances[current][c];
          best = c;
        }
      }
      sequence.push(best);
      candidates.delete(best);
      current = best;
    }
    sequence.push(wi); // regreso al almacén

    const ind: Individual = { sequence, fitness: 0, totalDistance: 0, totalDuration: 0, isValid: false };
    this.calculateFitness(ind);
    return ind;
  }

  // ─── Individuo aleatorio ───────────────────────────────────────────────────

  private createRandomIndividual(): Individual {
    const wi = this.warehouseIndex;
    const indices: number[] = [];
    for (let i = 0; i < this.stops.length; i++) {
      if (i !== wi) indices.push(i);
    }
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const sequence = [wi, ...indices, wi];
    const ind: Individual = { sequence, fitness: 0, totalDistance: 0, totalDuration: 0, isValid: false };
    this.calculateFitness(ind);
    return ind;
  }

  // ─── Selección por Torneo ──────────────────────────────────────────────────

  private tournamentSelection(population: Individual[], size = 4): Individual {
    let best = population[Math.floor(Math.random() * population.length)];
    for (let i = 1; i < size; i++) {
      const contender = population[Math.floor(Math.random() * population.length)];
      if (contender.fitness > best.fitness) best = contender;
    }
    return best;
  }

  // ─── Order Crossover (OX) ──────────────────────────────────────────────────

  private crossover(p1: Individual, p2: Individual): Individual {
    const len = p1.sequence.length;
    const childSeq = new Array(len).fill(-1);
    childSeq[0] = p1.sequence[0];
    childSeq[len - 1] = p1.sequence[len - 1];

    let pA = Math.floor(Math.random() * (len - 2)) + 1;
    let pB = Math.floor(Math.random() * (len - 2)) + 1;
    while (pA === pB && len > 3) pB = Math.floor(Math.random() * (len - 2)) + 1;

    const start = Math.min(pA, pB);
    const end = Math.max(pA, pB);

    for (let i = start; i <= end; i++) childSeq[i] = p1.sequence[i];

    let p2i = 1;
    for (let i = 1; i < len - 1; i++) {
      if (childSeq[i] === -1) {
        while (childSeq.includes(p2.sequence[p2i])) p2i++;
        childSeq[i] = p2.sequence[p2i];
      }
    }

    const ind: Individual = { sequence: childSeq, fitness: 0, totalDistance: 0, totalDuration: 0, isValid: false };
    this.calculateFitness(ind);
    return ind;
  }

  // ─── Mutación por Inversión ────────────────────────────────────────────────

  private mutate(ind: Individual, rate: number): void {
    if (Math.random() >= rate) return;
    const len = ind.sequence.length;
    if (len <= 3) return;

    const pA = Math.floor(Math.random() * (len - 2)) + 1;
    const pB = Math.floor(Math.random() * (len - 2)) + 1;
    if (pA === pB) return;

    const start = Math.min(pA, pB);
    const end = Math.max(pA, pB);
    const sub = ind.sequence.slice(start, end + 1).reverse();
    ind.sequence.splice(start, end - start + 1, ...sub);
    this.calculateFitness(ind);
  }

  // ─── 2-opt Local Search ────────────────────────────────────────────────────

  /**
   * Mejora una ruta mediante el algoritmo 2-opt.
   * Itera sobre todos los pares de aristas y acepta inversiones que reduzcan
   * la distancia total. Continúa hasta que no haya más mejoras posibles.
   */
  private twoOpt(ind: Individual): Individual {
    let improved = true;
    let best = { ...ind, sequence: [...ind.sequence] };

    while (improved) {
      improved = false;
      const len = best.sequence.length;

      for (let i = 1; i < len - 2; i++) {
        for (let j = i + 1; j < len - 1; j++) {
          // Calcular ganancia de invertir el segmento [i, j]
          const a = best.sequence[i - 1];
          const b = best.sequence[i];
          const c = best.sequence[j];
          const d = best.sequence[j + 1];

          const currentCost = this.distances[a][b] + this.distances[c][d];
          const newCost = this.distances[a][c] + this.distances[b][d];

          if (newCost < currentCost - 0.001) {
            // Invertir segmento entre i y j
            const newSeq = [...best.sequence];
            let left = i;
            let right = j;
            while (left < right) {
              [newSeq[left], newSeq[right]] = [newSeq[right], newSeq[left]];
              left++;
              right--;
            }

            const candidate: Individual = {
              sequence: newSeq,
              fitness: 0,
              totalDistance: 0,
              totalDuration: 0,
              isValid: false
            };
            this.calculateFitness(candidate);

            if (candidate.fitness > best.fitness) {
              best = candidate;
              improved = true;
            }
          }
        }
      }
    }

    return best;
  }

  // ─── Ejecución del GA ──────────────────────────────────────────────────────

  public run(): GeneticRouteResult {
    // Si solo hay 1 parada (+ almacén), no hay nada que optimizar
    if (this.stops.length <= 2) {
      const route = this.stops;
      return {
        route,
        totalDistance: 0,
        totalDurationMinutes: 0,
        fitness: 1,
        isValid: true
      };
    }

    // ── Población inicial ──────────────────────────────────────────────────
    let population: Individual[] = [];

    // El primer individuo siempre es el greedy nearest-neighbor
    population.push(this.nearestNeighborIndividual());

    // El resto aleatorio
    while (population.length < this.popSize) {
      population.push(this.createRandomIndividual());
    }

    // ── Evolución ─────────────────────────────────────────────────────────
    let bestFitnessLastN = 0;
    let generationsWithoutImprovement = 0;
    let currentMutationRate = this.mutationRate;
    const STAGNATION_LIMIT = 80; // generaciones sin mejora antes de aumentar mutación
    const ELITE_SIZE = 3;

    for (let gen = 0; gen < this.numGenerations; gen++) {
      population.sort((a, b) => b.fitness - a.fitness);

      // Control de mutación adaptativa
      if (population[0].fitness > bestFitnessLastN + 0.0000001) {
        bestFitnessLastN = population[0].fitness;
        generationsWithoutImprovement = 0;
        currentMutationRate = this.mutationRate; // reset
      } else {
        generationsWithoutImprovement++;
        if (generationsWithoutImprovement >= STAGNATION_LIMIT) {
          // Aumentar mutación para escapar del óptimo local
          currentMutationRate = Math.min(0.3, this.mutationRate * 4);
        }
      }

      const newPop: Individual[] = [];

      // Elitismo: conservar los mejores 3
      for (let e = 0; e < ELITE_SIZE && e < population.length; e++) {
        newPop.push(population[e]);
      }

      // Completar con hijos
      while (newPop.length < this.popSize) {
        const p1 = this.tournamentSelection(population);
        const p2 = this.tournamentSelection(population);
        const child = this.crossover(p1, p2);
        this.mutate(child, currentMutationRate);
        newPop.push(child);
      }

      population = newPop;
    }

    // ── Post-optimización 2-opt ────────────────────────────────────────────
    population.sort((a, b) => b.fitness - a.fitness);
    const optimized = this.twoOpt(population[0]);

    // ── Construir resultado con cronograma ────────────────────────────────
    const finalRoute = optimized.sequence.map(idx => ({ ...this.stops[idx] }));
    this.buildSchedule(finalRoute);

    return {
      route: finalRoute,
      totalDistance: optimized.totalDistance,
      totalDurationMinutes: optimized.totalDuration,
      fitness: optimized.fitness,
      isValid: optimized.isValid
    };
  }

  // ─── Cronograma temporal ───────────────────────────────────────────────────

  /**
   * Anota en cada parada de la ruta la hora estimada de llegada y salida,
   * y los minutos de tránsito desde la parada anterior.
   */
  private buildSchedule(route: RouteStop[]): void {
    let currentMinutes = this.startTimeMinutes;

    for (let i = 0; i < route.length; i++) {
      const stop = route[i];

      if (i === 0) {
        // Almacén al inicio
        stop.estimatedArrival = minutesToTime(currentMinutes);
        stop.estimatedDeparture = minutesToTime(currentMinutes);
        stop.transitMinutes = 0;
      } else {
        const prevStop = route[i - 1];

        // Calcular tránsito desde la parada anterior
        // Buscamos los índices originales en el arreglo de stops
        const prevOrigIdx = this.stops.findIndex(
          s => s.id === prevStop.id && s.type === prevStop.type
        );
        const currOrigIdx = this.stops.findIndex(
          s => s.id === stop.id && s.type === stop.type
        );

        let transitMin = 15; // fallback
        if (prevOrigIdx !== -1 && currOrigIdx !== -1 && this.durations[prevOrigIdx]?.[currOrigIdx] !== undefined) {
          transitMin = this.durations[prevOrigIdx][currOrigIdx];
        }

        stop.transitMinutes = Math.round(transitMin);
        currentMinutes += transitMin;
        stop.estimatedArrival = minutesToTime(currentMinutes);

        const serviceTime = stop.serviceTimeMinutes ?? this.defaultServiceTime(stop.type);
        currentMinutes += serviceTime;
        stop.estimatedDeparture = minutesToTime(currentMinutes);
      }
    }
  }

  private defaultServiceTime(type: RouteStop['type']): number {
    switch (type) {
      case 'supermarket': return 35; // carga desde supermercado
      case 'institution': return 30; // descarga en institución
      case 'colony': return 20;      // descarga en colonia
      case 'beneficiary': return 10; // entrega a beneficiario
      case 'warehouse': return 20;   // descarga/recarga en CEDIS
      default: return 15;
    }
  }
}
