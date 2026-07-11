import React, { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ExternalLink, LocateFixed, MapPin, Search } from 'lucide-react'
import { loadGoogleMaps } from '../utils/googleMapsLoader'
import { AddressAutocomplete } from './AddressAutocomplete'

interface LocationPickerProps {
  addressLabel?: string
  addressValue: string
  onAddressChange: (value: string) => void
  lat?: number
  lng?: number
  onLocationChange: (location: { address?: string; lat: number; lng: number }) => void
  tone?: 'orange' | 'emerald' | 'rose'
}

const DEFAULT_CENTER = { lat: 27.477850806886945, lng: -99.49498391012905 }

const toneClasses = {
  orange: {
    badge: 'bg-orange-50 text-orange-700 border-orange-100',
    marker: '#ea580c',
    focus: 'text-orange-700',
    leafletColor: '#ea580c'
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    marker: '#059669',
    focus: 'text-emerald-700',
    leafletColor: '#059669'
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-100',
    marker: '#e11d48',
    focus: 'text-rose-700',
    leafletColor: '#e11d48'
  }
}

// ─── Leaflet Map (Fallback gratuito) ─────────────────────────────────────────
const LeafletMap: React.FC<{
  lat: number
  lng: number
  color: string
  onPointSelected: (location: { lat: number; lng: number }) => void | Promise<void>
}> = ({ lat, lng, color, onPointSelected }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Leaflet is loaded via CDN script tag; access via window.L
    const initLeaflet = () => {
      const L = (window as any).L
      if (!L || !containerRef.current) return

      const center: [number, number] = lat && lng
        ? [lat, lng]
        : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(containerRef.current, { zoomControl: true }).setView(center, lat && lng ? 16 : 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map)

      // Custom colored icon
      const markerHtml = `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`
      const icon = L.divIcon({ html: markerHtml, className: '', iconSize: [22, 22], iconAnchor: [11, 11] })

      const marker = L.marker(center, { draggable: true, icon }).addTo(map)
      markerRef.current = marker

      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        onPointSelected({ lat: pos.lat, lng: pos.lng })
      })

      map.on('click', (e: any) => {
        const pos = e.latlng
        marker.setLatLng(pos)
        onPointSelected({ lat: pos.lat, lng: pos.lng })
      })

      mapRef.current = map

      // Fix Leaflet tile rendering after mount
      setTimeout(() => map.invalidateSize(), 100)
    }

    if ((window as any).L) {
      initLeaflet()
    } else {
      // Inject Leaflet CSS + JS if not already loaded
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script')
        script.id = 'leaflet-js'
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = initLeaflet
        document.head.appendChild(script)
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update marker when lat/lng change from outside (e.g. geocoding)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !lat || !lng) return
    const pos = [lat, lng]
    markerRef.current.setLatLng(pos)
    mapRef.current.setView(pos, 16)
  }, [lat, lng])

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}

// ─── Nominatim Geocoding ──────────────────────────────────────────────────────
async function nominatimGeocode(address: string): Promise<{ lat: number; lng: number; address: string } | null> {
  const fullQuery = `${address}, Nuevo Laredo, Tamaulipas, México`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=1&countrycodes=mx`
  const response = await fetch(url, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'BAMX-Nuevo-Laredo-Planner/1.0' }
  })
  if (!response.ok) return null
  const data = await response.json()
  if (!data.length) return null
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    address: data[0].display_name
  }
}

async function nominatimReverseGeocode(lat: number, lng: number): Promise<{ lat: number; lng: number; address: string } | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=jsonv2`
  const response = await fetch(url, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'BAMX-Nuevo-Laredo-Planner/1.0' }
  })
  if (!response.ok) return null
  const data = await response.json()
  if (!data?.display_name) return null
  return {
    lat,
    lng,
    address: data.display_name
  }
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export const LocationPicker: React.FC<LocationPickerProps> = ({
  addressLabel = 'Dirección / ubicación',
  addressValue,
  onAddressChange,
  lat = 0,
  lng = 0,
  onLocationChange,
  tone = 'orange'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [mapMode, setMapMode] = useState<'loading' | 'google' | 'leaflet'>('loading')
  const [mapError, setMapError] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState('')
  const [showManualCoordinates, setShowManualCoordinates] = useState(false)
  const selected = Boolean(lat && lng)
  const color = toneClasses[tone]

  const resolvePointSelection = async (nextLat: number, nextLng: number) => {
    try {
      let resolvedAddress: string | null = null

      if (mapMode === 'google') {
        const result = await window.api.googleMaps.reverseGeocode(nextLat, nextLng)
        if (result.success && result.address) {
          resolvedAddress = result.address
        }
      }

      if (!resolvedAddress) {
        const fallback = await nominatimReverseGeocode(nextLat, nextLng)
        resolvedAddress = fallback?.address || null
      }

      if (resolvedAddress) {
        onAddressChange(resolvedAddress)
        onLocationChange({ address: resolvedAddress, lat: nextLat, lng: nextLng })
        return
      }

      onLocationChange({ lat: nextLat, lng: nextLng })
    } catch (error) {
      console.error('Error resolving point selection:', error)
      onLocationChange({ lat: nextLat, lng: nextLng })
    }
  }

  // ── Google marker helper ──
  const setGoogleMarker = (google: typeof window.google, position: google.maps.LatLngLiteral) => {
    if (!mapRef.current) return
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position,
        draggable: true,
        title: 'Ubicación seleccionada',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: color.marker,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      })
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current?.getPosition()
        if (!pos) return
        void resolvePointSelection(pos.lat(), pos.lng())
      })
    } else {
      markerRef.current.setPosition(position)
    }
  }

  // ── Determine map mode ──
  useEffect(() => {
    let active = true

    const init = async () => {
      try {
        const useGMSetting = await window.api.settings.get('use_google_maps')
        const apiKeySetting = await window.api.settings.get('google_maps_api_key')

        if (useGMSetting?.value === 'true' && apiKeySetting?.value) {
          // Try Google Maps
          try {
            const google = await loadGoogleMaps()
            if (!active || !mapContainerRef.current) return

            const center = selected ? { lat, lng } : DEFAULT_CENTER
            const map = new google.maps.Map(mapContainerRef.current, {
              center,
              zoom: selected ? 16 : 12,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              clickableIcons: false
            })
            mapRef.current = map
            setMapMode('google')
            setMapError('')

            if (selected) setGoogleMarker(google, { lat, lng })

            map.addListener('click', (event: google.maps.MapMouseEvent) => {
              if (!event.latLng) return
              const position = { lat: event.latLng.lat(), lng: event.latLng.lng() }
              setGoogleMarker(google, position)
              void resolvePointSelection(position.lat, position.lng)
            })
            return
          } catch {
            // fall through to Leaflet
          }
        }

        if (active) {
          setMapMode('leaflet')
          setMapError('')
        }
      } catch (error) {
        console.error('Error loading location picker:', error)
        if (active) {
          setMapMode('leaflet')
          setMapError('')
        }
      }
    }

    init()

    // Auto-switch to Leaflet if Google Maps auth fails at runtime
    const handleGMFailed = () => {
      if (mapRef.current) {
        mapRef.current = null
        if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null }
      }
      setMapMode('leaflet')
    }
    window.addEventListener('google-maps-failed', handleGMFailed)

    return () => {
      active = false
      window.removeEventListener('google-maps-failed', handleGMFailed)
      if (markerRef.current) markerRef.current.setMap(null)
      markerRef.current = null
      mapRef.current = null
    }

  }, [])

  // ── Update Google marker when lat/lng changes externally ──
  useEffect(() => {
    if (mapMode !== 'google' || !mapRef.current || !window.google?.maps || !selected) return
    const position = { lat, lng }
    mapRef.current.panTo(position)
    setGoogleMarker(window.google, position)
  }, [lat, lng, selected, mapMode])

  // ── Geocoding: Google or Nominatim depending on mode ──
  const handleGeocodeAddress = async () => {
    if (!addressValue.trim()) {
      setGeocodeError('Escribe una dirección o referencia primero.')
      return
    }

    setGeocoding(true)
    setGeocodeError('')
    try {
      if (mapMode === 'google') {
        const result = await window.api.googleMaps.geocode(addressValue)
        if (!result.success || result.lat == null || result.lng == null) {
          setGeocodeError(result.error || 'No se encontró la ubicación.')
          return
        }
        onAddressChange(result.address || addressValue)
        onLocationChange({ address: result.address || addressValue, lat: result.lat, lng: result.lng })
      } else {
        // Nominatim fallback
        const result = await nominatimGeocode(addressValue)
        if (!result) {
          setGeocodeError('No se encontró la ubicación. Intenta con una referencia más específica.')
          return
        }
        onAddressChange(result.address)
        onLocationChange({ address: result.address, lat: result.lat, lng: result.lng })
      }
    } catch (error: any) {
      setGeocodeError(error?.message || 'No se pudo buscar la ubicación.')
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin size={18} className={color.focus} />
          <p className="text-sm font-black text-slate-950">Ubicación</p>
        </div>
        <div className="flex items-center gap-2">
          {mapMode === 'leaflet' && (
            <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-sky-700">
              OpenStreetMap
            </span>
          )}
          {mapMode === 'google' && (
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              Google Maps
            </span>
          )}
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              selected ? color.badge : 'border-amber-100 bg-amber-50 text-amber-700'
            }`}
          >
            {selected ? 'Lista' : 'Pendiente'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="ml-1 text-xs font-black uppercase tracking-widest text-slate-400">
            {addressLabel}
          </label>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <AddressAutocomplete
                value={addressValue}
                onChange={(value) => {
                  setGeocodeError('')
                  onAddressChange(value)
                }}
                placeholder="Busca la dirección o escribe una referencia"
                onSelectPlace={(place) => {
                  setGeocodeError('')
                  onAddressChange(place.address)
                  onLocationChange({ address: place.address, lat: place.lat, lng: place.lng })
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleGeocodeAddress}
              disabled={geocoding}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800 disabled:opacity-50"
              title="Buscar coordenadas"
            >
              <Search size={16} />
              {geocoding ? 'Buscando' : 'Ubicar'}
            </button>
          </div>
          {geocodeError && (
            <p className="ml-1 text-xs font-semibold text-amber-700">{geocodeError}</p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {mapMode === 'loading' && (
            <div className="h-60 w-full flex items-center justify-center bg-slate-100">
              <p className="text-sm text-slate-400 font-medium">Cargando mapa...</p>
            </div>
          )}

          {mapMode === 'google' && (
            <div ref={mapContainerRef} className="h-60 w-full bg-slate-100" />
          )}

          {mapMode === 'leaflet' && (
            <div className="h-60 w-full">
              <LeafletMap
                lat={lat}
                lng={lng}
                color={color.leafletColor}
                onPointSelected={(position) => void resolvePointSelection(position.lat, position.lng)}
              />
            </div>
          )}
        </div>

        {mapError && (
          <p className="ml-1 text-xs font-semibold text-amber-700">{mapError}</p>
        )}

        {showManualCoordinates && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="space-y-1">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Latitud
              </label>
              <input
                type="number"
                step="any"
                value={lat || 0}
                onChange={(event) => onLocationChange({ lat: parseFloat(event.target.value) || 0, lng })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-orange-400"
              />
            </div>
            <div className="space-y-1">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Longitud
              </label>
              <input
                type="number"
                step="any"
                value={lng || 0}
                onChange={(event) => onLocationChange({ lat, lng: parseFloat(event.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-orange-400"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            {selected ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <LocateFixed size={16} className="text-amber-600" />
            )}
            <span className="font-semibold">
              {selected
                ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
                : 'Selecciona un punto en el mapa o usa el buscador'}
            </span>
          </div>
          {selected && (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-orange-700"
            >
              Verificar en Maps
              <ExternalLink size={14} />
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowManualCoordinates(!showManualCoordinates)}
            className="font-bold text-slate-500 hover:text-slate-900"
          >
            {showManualCoordinates ? 'Ocultar coordenadas' : 'Editar coordenadas'}
          </button>
        </div>
      </div>
    </section>
  )
}
