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
    focus: 'text-orange-700'
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    marker: '#059669',
    focus: 'text-emerald-700'
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-100',
    marker: '#e11d48',
    focus: 'text-rose-700'
  }
}

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
  const [googleReady, setGoogleReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState('')
  const [showManualCoordinates, setShowManualCoordinates] = useState(false)
  const selected = Boolean(lat && lng)
  const color = toneClasses[tone]

  const setMarker = (google: typeof window.google, position: google.maps.LatLngLiteral) => {
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
        const markerPosition = markerRef.current?.getPosition()
        if (!markerPosition) return
        onLocationChange({
          lat: markerPosition.lat(),
          lng: markerPosition.lng()
        })
      })
    } else {
      markerRef.current.setPosition(position)
    }
  }

  useEffect(() => {
    let active = true

    const initMap = async () => {
      try {
        const useGMSetting = await window.api.settings.get('use_google_maps')
        const apiKeySetting = await window.api.settings.get('google_maps_api_key')

        if (useGMSetting?.value !== 'true' || !apiKeySetting?.value || !mapContainerRef.current) {
          setGoogleReady(false)
          return
        }

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
        setGoogleReady(true)
        setMapError('')

        if (selected) setMarker(google, { lat, lng })

        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return
          const position = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          }
          setMarker(google, position)
          onLocationChange(position)
        })
      } catch (error) {
        console.error('Error loading location picker map:', error)
        setGoogleReady(false)
        setMapError('No se pudo cargar el mapa. Puedes capturar las coordenadas manualmente.')
      }
    }

    initMap()

    return () => {
      active = false
      if (markerRef.current) markerRef.current.setMap(null)
      markerRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || !selected) return
    const position = { lat, lng }
    mapRef.current.panTo(position)
    setMarker(window.google, position)
  }, [lat, lng, selected])

  const handleGeocodeAddress = async () => {
    if (!addressValue.trim()) {
      setGeocodeError('Escribe una dirección o referencia primero.')
      return
    }

    setGeocoding(true)
    setGeocodeError('')
    try {
      const result = await window.api.googleMaps.geocode(addressValue)
      if (!result.success || result.lat == null || result.lng == null) {
        setGeocodeError(result.error || 'No se encontró la ubicación.')
        return
      }

      onAddressChange(result.address || addressValue)
      onLocationChange({
        address: result.address || addressValue,
        lat: result.lat,
        lng: result.lng
      })
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
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
            selected ? color.badge : 'border-amber-100 bg-amber-50 text-amber-700'
          }`}
        >
          {selected ? 'Lista' : 'Pendiente'}
        </span>
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
              title="Buscar coordenadas con Google"
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
          <div ref={mapContainerRef} className="h-60 w-full bg-slate-100" />
          {!googleReady && (
            <div className="-mt-60 flex h-60 w-full flex-col items-center justify-center bg-slate-100 px-6 text-center">
              <LocateFixed className="mb-3 text-slate-300" size={34} />
              <p className="text-sm font-bold text-slate-600">Mapa interactivo no disponible</p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {mapError || 'Cuando Google Maps esté activo podrás hacer clic en el mapa para fijar el punto.'}
              </p>
            </div>
          )}
        </div>

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
                : 'Selecciona un punto para mejorar las rutas'}
            </span>
          </div>
          {selected && (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-orange-700"
            >
              Abrir en Maps
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
