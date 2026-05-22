// geneticRouting.ts

export interface RouteStop {
  id: number;
  name?: string;
  type: 'warehouse' | 'supermarket' | 'colony' | 'institution' | 'beneficiary';
  demand: number; // Kilos (positivo para recoleccion, negativo para entrega)
  lat?: number;
  lng?: number;
}

export interface GeneticRouteResult {
  route: RouteStop[];       // Secuencia final de la ruta
  totalDistance: number;    // Distancia total
  fitness: number;          // Valor de aptitud (inverso al costo)
  isValid: boolean;         // Si la ruta cumple con la capacidad y reglas
}

export interface GeneticAlgorithmConfig {
  stops: RouteStop[];           // Lista de todas las paradas (incluyendo el almacen)
  distances: number[][];        // Matriz de distancias pre-calculadas
  truckCapacity: number;        // Capacidad del camion (kilos/unidades)
  popSize?: number;             // Tamano de la poblacion (por defecto: 100)
  numGenerations?: number;      // Numero de generaciones (por defecto: 500)
  mutationRate?: number;        // Tasa de mutacion (por defecto: 0.05)
}

interface Individual {
  sequence: number[]; // Indices de las paradas en el arreglo 'stops'
  fitness: number;
  totalDistance: number;
  isValid: boolean;
}

export class GeneticRouting {
  private stops: RouteStop[];
  private distances: number[][];
  private truckCapacity: number;
  
  private popSize: number;
  private numGenerations: number;
  private mutationRate: number;

  constructor(config: GeneticAlgorithmConfig) {
    this.stops = config.stops;
    this.distances = config.distances;
    this.truckCapacity = config.truckCapacity;
    this.popSize = config.popSize || 100;
    this.numGenerations = config.numGenerations || 500;
    this.mutationRate = config.mutationRate || 0.05;
  }

  /**
   * Calcula el fitness (aptitud) de un individuo.
   * Busca minimizar la distancia total sin exceder la capacidad del camion.
   */
  private calculateFitness(ind: Individual): void {
      let totalDistance = 0;
      let currentLoad = 0;
      let capacityPenalty = 0;

      for (let j = 1; j < ind.sequence.length; j++) {
          const prevStopIndex = ind.sequence[j - 1];
          const currStopIndex = ind.sequence[j];
          const currStop = this.stops[currStopIndex];

          // 1. Acumular distancia entre paradas
          totalDistance += this.distances[prevStopIndex][currStopIndex];

          // 2. Actualizar carga actual segun la demanda de la parada
          currentLoad += currStop.demand;

          // 3. Penalizacion si se excede la capacidad o la carga es negativa
          if (currentLoad > this.truckCapacity) {
              capacityPenalty += 5000; // Valor alto para descartar rutas invalidas
          } else if (currentLoad < 0) {
              capacityPenalty += 5000;
          }
      }

      ind.totalDistance = totalDistance;
      ind.isValid = capacityPenalty === 0 && currentLoad >= 0;

      // El fitness es el inverso del costo total para poder maximizarlo
      const totalCost = totalDistance + capacityPenalty;
      ind.fitness = 1.0 / (totalCost + 1);
  }

  /**
   * Genera un individuo con una secuencia de paradas aleatoria.
   * La ruta siempre inicia y termina en el almacen.
   */
  private createIndividual(): Individual {
      const sequence: number[] = [];
      let warehouseIndex = 0;

      // Identificar el índice del almacén
      warehouseIndex = this.stops.findIndex(s => s.type === 'warehouse');
      if (warehouseIndex === -1) warehouseIndex = 0;

      // Agregar indices de todas las paradas excepto el almacen
      for (let i = 0; i < this.stops.length; i++) {
          if (i !== warehouseIndex) {
              sequence.push(i);
          }
      }

      // Mezclar las paradas intermedias de forma aleatoria
      for (let i = sequence.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
      }

      // Insertar el almacen al inicio y al final
      sequence.unshift(warehouseIndex);
      sequence.push(warehouseIndex);

      const ind: Individual = {
          sequence,
          fitness: 0,
          totalDistance: 0,
          isValid: false
      };

      this.calculateFitness(ind);
      return ind;
  }

  /**
   * Seleccion por Torneo: elige al mejor de un grupo aleatorio.
   */
  private tournamentSelection(population: Individual[]): Individual {
      let best: Individual = population[Math.floor(Math.random() * population.length)];
      
      for (let i = 1; i < 3; i++) {
          const contender = population[Math.floor(Math.random() * population.length)];
          if (contender.fitness > best.fitness) {
              best = contender;
          }
      }
      return best;
  }

  /**
   * Operador de Cruce (Order Crossover): hereda segmentos de dos padres.
   */
  private crossover(parent1: Individual, parent2: Individual): Individual {
      const p1Seq = parent1.sequence;
      const p2Seq = parent2.sequence;
      const length = p1Seq.length;

      const childSeq = new Array(length).fill(-1);
      
      // Respetar almacenes en extremos
      childSeq[0] = p1Seq[0];
      childSeq[length - 1] = p1Seq[length - 1];

      // Seleccionar puntos de corte aleatorios
      const pA = Math.floor(Math.random() * (length - 2)) + 1;
      let pB = Math.floor(Math.random() * (length - 2)) + 1;
      
      while (pA === pB && length > 3) {
          pB = Math.floor(Math.random() * (length - 2)) + 1;
      }

      const start = Math.min(pA, pB);
      const end = Math.max(pA, pB);

      // Copiar segmento del primer padre
      for (let i = start; i <= end; i++) {
          childSeq[i] = p1Seq[i];
      }

      // Rellenar espacios vacios con el segundo padre evitando duplicados
      let p2Index = 1; 
      for (let i = 1; i < length - 1; i++) {
          if (childSeq[i] === -1) {
              while (childSeq.includes(p2Seq[p2Index])) {
                  p2Index++;
              }
              childSeq[i] = p2Seq[p2Index];
          }
      }

      const child: Individual = {
          sequence: childSeq,
          fitness: 0,
          totalDistance: 0,
          isValid: false
      };

      this.calculateFitness(child);
      return child;
  }

  /**
   * Mutacion por Inversion: invierte el orden de un segmento aleatorio.
   */
  private mutate(ind: Individual): void {
      if (Math.random() < this.mutationRate) {
          const length = ind.sequence.length;
          if (length <= 3) return;

          const pA = Math.floor(Math.random() * (length - 2)) + 1;
          const pB = Math.floor(Math.random() * (length - 2)) + 1;
          
          if (pA === pB) return;

          const start = Math.min(pA, pB);
          const end = Math.max(pA, pB);

          const sub = ind.sequence.slice(start, end + 1).reverse();
          ind.sequence.splice(start, end - start + 1, ...sub);
      }
      this.calculateFitness(ind);
  }

  /**
   * Ejecuta el Algoritmo Genetico para encontrar la mejor ruta.
   */
  public run(): GeneticRouteResult {
      let population: Individual[] = [];

      // Inicializar poblacion inicial
      for (let i = 0; i < this.popSize; i++) {
          population.push(this.createIndividual());
      }

      // Proceso evolutivo
      for (let gen = 0; gen < this.numGenerations; gen++) {
          const newPopulation: Individual[] = [];

          // Mantener al mejor de la generación anterior (elitismo)
          population.sort((a, b) => b.fitness - a.fitness);
          newPopulation.push(population[0]); 

          while (newPopulation.length < this.popSize) {
              const parent1 = this.tournamentSelection(population);
              const parent2 = this.tournamentSelection(population);
              const child = this.crossover(parent1, parent2);
              this.mutate(child);
              newPopulation.push(child);
          }

          population = newPopulation;
      }

      // Seleccionar el mejor resultado
      population.sort((a, b) => b.fitness - a.fitness);
      const best = population[0];

      const finalRoute = best.sequence.map(index => this.stops[index]);

      return {
          route: finalRoute,
          totalDistance: best.totalDistance,
          fitness: best.fitness,
          isValid: best.isValid
      };
  }
}
