/**
 * distanceMatrix.ts
 *
 * Motor de cálculo de distancias reales por carretera usando OSRM
 * (Open Source Routing Machine) con datos de OpenStreetMap.
 *
 * Estrategia:
 *   1. Se intenta obtener la matriz de distancias/duraciones desde OSRM Table API.
 *   2. Si la petición falla (sin conexión, timeout), se usa la fórmula Haversine
 *      como respaldo (distancia en línea recta * factor de corrección 1.3).
 *   3. Los resultados se cachean en memoria durante la sesión para evitar
 *      peticiones repetidas con los mismos puntos.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
  id?: number | string;
  name?: string;
}

export interface DistanceMatrixResult {
  /** Matriz de distancias en kilómetros [i][j] */
  distances: number[][];
  /** Matriz de duraciones en minutos [i][j] */
  durations: number[][];
  /** true si se obtuvo desde OSRM, false si es Haversine */
  fromOSRM: boolean;
}

// --- Caché de sesión ---
// Clave: hash de coordenadas ordenadas
const sessionCache = new Map<string, DistanceMatrixResult>();

/**
 * Genera una clave de caché determinista a partir de los puntos geográficos.
 */
function cacheKey(points: GeoPoint[]): string {
  return points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
}

/**
 * Calcula la distancia Haversine entre dos puntos en kilómetros.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Construye una matriz de distancias y duraciones usando Haversine.
 * Aplica un factor de corrección de 1.35 para aproximar la distancia real
 * por carretera (estudios empíricos muestran que la distancia real es ~35%
 * mayor a la línea recta en zonas urbanas).
 *
 * La velocidad asumida depende del tipo de zona:
 *  - Zona urbana: 35 km/h
 *  - Zona rural (lat < 27.35 o lat > 27.58): 60 km/h
 */
export function buildHaversineMatrix(points: GeoPoint[]): DistanceMatrixResult {
  const n = points.length;
  const distances: number[][] = [];
  const durations: number[][] = [];
  const ROAD_FACTOR = 1.35;
  const URBAN_SPEED = 35; // km/h
  const RURAL_SPEED = 60; // km/h

  for (let i = 0; i < n; i++) {
    distances[i] = [];
    durations[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
        durations[i][j] = 0;
      } else {
        const straight = haversineKm(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
        const roadDist = straight * ROAD_FACTOR;
        // Determinar si el destino es zona rural
        const isRural = points[j].lat < 27.35 || points[j].lat > 27.58;
        const speed = isRural ? RURAL_SPEED : URBAN_SPEED;
        const durationMin = (roadDist / speed) * 60;
        distances[i][j] = roadDist;
        durations[i][j] = durationMin;
      }
    }
  }

  return { distances, durations, fromOSRM: false };
}

/**
 * Obtiene la matriz de distancias/duraciones desde OSRM Table API.
 *
 * Endpoint: https://router.project-osrm.org/table/v1/driving/{coordenadas}
 * Las distancias se devuelven en metros → convertidas a km.
 * Las duraciones se devuelven en segundos → convertidas a minutos.
 *
 * Límite de tamaño: OSRM demo permite hasta ~100 coordenadas por petición.
 * Timeout de 8 segundos para evitar bloquear la UI.
 */
export async function fetchOSRMMatrix(points: GeoPoint[]): Promise<DistanceMatrixResult | null> {
  try {
    // OSRM espera coordenadas en formato lng,lat (¡invertido!)
    const coords = points.map(p => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[OSRM] Respuesta no OK:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.distances || !data.durations) {
      console.warn('[OSRM] Respuesta inválida:', data.code);
      return null;
    }

    const n = points.length;
    const distances: number[][] = [];
    const durations: number[][] = [];

    for (let i = 0; i < n; i++) {
      distances[i] = [];
      durations[i] = [];
      for (let j = 0; j < n; j++) {
        // OSRM puede devolver null para rutas imposibles; usar Haversine como respaldo puntual
        const rawDist = data.distances[i][j];
        const rawDur = data.durations[i][j];
        if (rawDist === null || rawDist === undefined) {
          distances[i][j] = haversineKm(points[i].lat, points[i].lng, points[j].lat, points[j].lng) * 1.35;
        } else {
          distances[i][j] = rawDist / 1000; // metros → km
        }
        if (rawDur === null || rawDur === undefined) {
          durations[i][j] = (distances[i][j] / 35) * 60; // fallback 35 km/h
        } else {
          durations[i][j] = rawDur / 60; // segundos → minutos
        }
      }
    }

    console.log(`[OSRM] Matriz ${n}×${n} obtenida. Distancia total aprox: ${distances[0].reduce((a, b) => a + b, 0).toFixed(1)} km`);
    return { distances, durations, fromOSRM: true };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[OSRM] Timeout al obtener la matriz de distancias');
    } else {
      console.warn('[OSRM] Error de red:', err.message);
    }
    return null;
  }
}

/**
 * Función principal: obtiene la matriz de distancias real.
 * 1. Revisa caché de sesión.
 * 2. Intenta OSRM.
 * 3. Si falla, usa Haversine.
 *
 * @param points  Lista de puntos geográficos (incluyendo el CEDIS al inicio)
 * @returns       DistanceMatrixResult con matrices de distancias y duraciones
 */
export async function getDistanceMatrix(points: GeoPoint[]): Promise<DistanceMatrixResult> {
  const key = cacheKey(points);

  // 1. Revisar caché
  if (sessionCache.has(key)) {
    console.log('[DistanceMatrix] Usando caché de sesión.');
    return sessionCache.get(key)!;
  }

  // 2. Intentar OSRM
  console.log(`[DistanceMatrix] Consultando OSRM para ${points.length} puntos...`);
  const osrmResult = await fetchOSRMMatrix(points);

  if (osrmResult) {
    sessionCache.set(key, osrmResult);
    return osrmResult;
  }

  // 3. Fallback: Haversine
  console.warn('[DistanceMatrix] Usando Haversine como respaldo (sin conexión a OSRM).');
  const haversineResult = buildHaversineMatrix(points);
  sessionCache.set(key, haversineResult);
  return haversineResult;
}

/**
 * Limpia el caché de sesión (útil si el usuario actualiza coordenadas).
 */
export function clearDistanceCache(): void {
  sessionCache.clear();
  console.log('[DistanceMatrix] Caché limpiado.');
}
