let loadPromise: Promise<typeof google> | null = null
let lastLoadedKey: string | null = null
let authFailed = false

/**
 * Loads the Google Maps JavaScript SDK.
 *
 * Critical design notes:
 * - `gm_authFailure` is Google's special callback for invalid/deleted/disabled keys.
 *   It fires ASYNCHRONOUSLY after the script loads (and possibly after the promise
 *   already resolved), so we CANNOT rely solely on promise rejection.
 *   Instead, we ALSO dispatch `google-maps-failed` directly from gm_authFailure,
 *   so all consumers (MapVisualizer, AddressAutocomplete, etc.) can react immediately.
 */
export async function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    throw new Error('loadGoogleMaps solo se puede llamar en el navegador.')
  }

  // Get current key from settings
  let currentKey: string | null = null
  try {
    const apiKeySetting = await window.api.settings.get('google_maps_api_key')
    currentKey = apiKeySetting?.value || null
  } catch {
    currentKey = null
  }

  if (!currentKey) {
    throw new Error('API Key de Google Maps no encontrada en la configuración.')
  }

  // If a previous auth failure occurred with this key, don't retry
  if (authFailed && lastLoadedKey === currentKey) {
    throw new Error('Google Maps: Error de autenticación previo (API key inválida o proyecto eliminado).')
  }

  // If the key changed, invalidate cache and clear auth failure flag
  if (lastLoadedKey && lastLoadedKey !== currentKey) {
    loadPromise = null
    authFailed = false
    const oldScript = document.getElementById('google-maps-script')
    if (oldScript) oldScript.remove()
  }

  if (window.google?.maps && lastLoadedKey === currentKey && !authFailed) {
    return window.google
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise<typeof google>((resolve, reject) => {
    // ─── CRITICAL: Intercept Google's async auth failure ─────────────────────
    // gm_authFailure fires asynchronously AFTER the script loads, so the promise
    // may already be resolved when it fires. We dispatch the custom event directly
    // so all consumers switch to fallback mode regardless of promise state.
    ;(window as any).gm_authFailure = () => {
      console.warn('[GoogleMaps] gm_authFailure: clave inválida, API desactivada o proyecto eliminado. Activando modo OpenStreetMap.')
      authFailed = true
      loadPromise = null
      const script = document.getElementById('google-maps-script')
      if (script) script.remove()

      // Dispatch directly — works even if the promise already resolved
      window.dispatchEvent(new CustomEvent('google-maps-failed'))

      // Also reject the promise for consumers that are still waiting
      reject(new Error('Google Maps: Error de autenticación (API key inválida, proyecto eliminado o API desactivada).'))
    }

    const existingScript = document.getElementById('google-maps-script')
    if (existingScript) {
      let checkCount = 0
      const interval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(interval)
          lastLoadedKey = currentKey
          resolve(window.google)
        }
        checkCount++
        if (checkCount > 60) {
          clearInterval(interval)
          loadPromise = null
          reject(new Error('Timeout cargando Google Maps API script.'))
        }
      }, 100)
      return
    }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${currentKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google?.maps) {
        lastLoadedKey = currentKey
        resolve(window.google)
      } else {
        loadPromise = null
        reject(new Error('Google Maps se cargó pero google.maps no está definido.'))
      }
    }

    script.onerror = () => {
      loadPromise = null
      const s = document.getElementById('google-maps-script')
      if (s) s.remove()
      window.dispatchEvent(new CustomEvent('google-maps-failed'))
      reject(new Error('Error de red al cargar el script de Google Maps.'))
    }

    document.head.appendChild(script)
  })

  return loadPromise
}

/**
 * Resets the loader cache. Call this when the user updates or clears the API key.
 */
export function resetGoogleMapsLoader(): void {
  loadPromise = null
  lastLoadedKey = null
  authFailed = false
  const script = document.getElementById('google-maps-script')
  if (script) script.remove()
  delete (window as any).gm_authFailure
}
