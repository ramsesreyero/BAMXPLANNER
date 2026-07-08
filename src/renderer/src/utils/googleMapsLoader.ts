let loadPromise: Promise<typeof google> | null = null

export async function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    throw new Error('loadGoogleMaps solo se puede llamar en el navegador.')
  }

  if (window.google?.maps) {
    return window.google
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise(async (resolve, reject) => {
    try {
      const apiKeySetting = await window.api.settings.get('google_maps_api_key')
      const apiKey = apiKeySetting?.value

      if (!apiKey) {
        throw new Error('API Key de Google Maps no encontrada en la configuración.')
      }

      // Check if script is already present in document
      const existingScript = document.getElementById('google-maps-script')
      if (existingScript) {
        // Wait for it to load
        let checkCount = 0
        const interval = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(interval)
            resolve(window.google)
          }
          checkCount++
          if (checkCount > 50) { // 5 seconds timeout
            clearInterval(interval)
            reject(new Error('Timeout cargando Google Maps API script.'))
          }
        }, 100)
        return
      }

      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google)
        } else {
          reject(new Error('Google Maps se cargó pero google.maps no está definido.'))
        }
      }

      script.onerror = () => {
        reject(new Error('Error al cargar el script de Google Maps.'))
      }

      document.head.appendChild(script)
    } catch (error) {
      loadPromise = null // Allow retry
      reject(error)
    }
  })

  return loadPromise
}
