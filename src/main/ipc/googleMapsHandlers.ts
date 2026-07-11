import { ipcMain } from 'electron'
import { initDB } from '../database'

const BUILT_IN_GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

// Helper to fetch Google Maps API Key from the database settings
function getApiKey(): string | null {
  const db = initDB()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_maps_api_key') as { value: string } | undefined
  return row?.value || BUILT_IN_GOOGLE_MAPS_API_KEY || null
}

export function registerGoogleMapsHandlers() {
  ipcMain.handle('google-maps:geocode', async (_, address: string) => {
    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        throw new Error('Google Maps no está configurado.')
      }
      if (!address?.trim()) {
        return { success: false, error: 'Escribe una dirección para buscar.' }
      }

      const query = `${address}, Nuevo Laredo, Tamaulipas, México`
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Google Geocoding respondió con código ${response.status}`)
      }

      const data = await response.json()
      if (data.status !== 'OK' || !data.results?.length) {
        return {
          success: false,
          error: data.error_message || `No se encontró una ubicación para "${address}".`
        }
      }

      const result = data.results[0]
      return {
        success: true,
        address: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      }
    } catch (error: any) {
      console.error('Error in Google Maps Geocode IPC:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('google-maps:reverse-geocode', async (_, lat: number, lng: number) => {
    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        throw new Error('Google Maps no está configurado.')
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { success: false, error: 'Coordenadas inválidas.' }
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(`${lat},${lng}`)}&key=${apiKey}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Google Reverse Geocoding respondió con código ${response.status}`)
      }

      const data = await response.json()
      if (data.status !== 'OK' || !data.results?.length) {
        return {
          success: false,
          error: data.error_message || 'No se pudo resolver la dirección desde el punto marcado.'
        }
      }

      const result = data.results[0]
      return {
        success: true,
        address: result.formatted_address,
        lat,
        lng
      }
    } catch (error: any) {
      console.error('Error in Google Maps Reverse Geocode IPC:', error)
      return { success: false, error: error.message }
    }
  })

  // Verify API Key
  ipcMain.handle('google-maps:verify-key', async (_, key: string) => {
    try {
      if (!key) return { success: false, message: 'La clave API está vacía.' }
      
      // Test the API key with a simple Geocoding request for Nuevo Laredo
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Nuevo+Laredo,Tamaulipas,Mexico&key=${key}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.status === 'OK') {
        return { success: true, message: 'Conexión exitosa. La clave API es válida.' }
      } else {
        return { 
          success: false, 
          message: data.error_message || `Error de Google API: ${data.status}` 
        }
      }
    } catch (error: any) {
      return { success: false, message: `Error de red o conexión: ${error.message}` }
    }
  })

  // Distance Matrix Proxy with chunking support (Google allows max 25x25 elements per request)
  ipcMain.handle('google-maps:distance-matrix', async (_, points: { lat: number; lng: number }[]) => {
    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        throw new Error('API Key de Google Maps no encontrada en la configuración.')
      }

      const n = points.length
      if (n === 0) return { distances: [], durations: [] }

      // Initialize results matrices
      const distances: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
      const durations: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

      // Google Maps Matrix limits: max 25 origins/destinations AND max 100 elements per request.
      // We use a chunkSize of 10 (10 * 10 = 100 elements) to stay within this limit safely.
      const chunkSize = 10

      // Loop through chunks of origins
      for (let i = 0; i < n; i += chunkSize) {
        const originsChunk = points.slice(i, i + chunkSize)
        const originsStr = originsChunk.map(p => `${p.lat},${p.lng}`).join('|')

        // Loop through chunks of destinations
        for (let j = 0; j < n; j += chunkSize) {
          const destinationsChunk = points.slice(j, j + chunkSize)
          const destinationsStr = destinationsChunk.map(p => `${p.lat},${p.lng}`).join('|')

          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinationsStr)}&key=${apiKey}`
          
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Google Distance Matrix API respondió con código ${response.status}`)
          }
          
          const data = await response.json()
          if (data.status !== 'OK') {
            throw new Error(`Error en Google Distance Matrix: ${data.status} - ${data.error_message || ''}`)
          }

          // Map the results back to the main matrix
          for (let r = 0; r < data.rows.length; r++) {
            const elements = data.rows[r].elements
            for (let c = 0; c < elements.length; c++) {
              const element = elements[c]
              const origIndex = i + r
              const destIndex = j + c

              if (element.status === 'OK') {
                distances[origIndex][destIndex] = element.distance.value / 1000 // meters -> km
                durations[origIndex][destIndex] = element.duration.value / 60   // seconds -> minutes
              } else {
                // Fallback inside chunk if a specific route is not found: use Haversine
                const lat1 = points[origIndex].lat
                const lng1 = points[origIndex].lng
                const lat2 = points[destIndex].lat
                const lng2 = points[destIndex].lng
                
                // Simple straight line distance fallback (Haversine * 1.35 factor)
                const R = 6371
                const dLat = ((lat2 - lat1) * Math.PI) / 180
                const dLng = ((lng2 - lng1) * Math.PI) / 180
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) * Math.sin(dLng/2)
                const cVal = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                const roadDist = R * cVal * 1.35

                distances[origIndex][destIndex] = roadDist
                durations[origIndex][destIndex] = (roadDist / 35) * 60 // 35 km/h urban speed fallback
              }
            }
          }
        }
      }

      return { distances, durations, success: true }
    } catch (error: any) {
      console.error('Error in Google Maps Distance Matrix IPC:', error)
      return { success: false, error: error.message }
    }
  })

  // Directions Proxy
  ipcMain.handle('google-maps:directions', async (_, origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, waypoints: { lat: number; lng: number }[] = []) => {
    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        throw new Error('API Key de Google Maps no encontrada en la configuración.')
      }

      const originStr = `${origin.lat},${origin.lng}`
      const destinationStr = `${destination.lat},${destination.lng}`
      
      let waypointsStr = ''
      if (waypoints.length > 0) {
        // optimize:true tells Google to find the best sequence for these waypoints
        // but since we already optimize using Genetic Algorithm, we can pass optimize:false
        waypointsStr = '&waypoints=' + waypoints.map(w => `${w.lat},${w.lng}`).join('|')
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destinationStr)}${waypointsStr}&key=${apiKey}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Google Directions API respondió con código ${response.status}`)
      }

      const data = await response.json()
      if (data.status !== 'OK') {
        throw new Error(`Error en Google Directions: ${data.status} - ${data.error_message || ''}`)
      }

      // Extract geometry path coordinates
      // Directions API returns polylines which are encoded. We can return the raw response
      // and decode the polyline in the frontend. Or we can decode here.
      // Returning the raw data allows the frontend to access leg details, bounds, etc.
      return { data, success: true }
    } catch (error: any) {
      console.error('Error in Google Maps Directions IPC:', error)
      return { success: false, error: error.message }
    }
  })
}
