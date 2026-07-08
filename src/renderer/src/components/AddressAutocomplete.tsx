import React, { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../utils/googleMapsLoader'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelectPlace: (place: { address: string; lat: number; lng: number }) => void
  placeholder?: string
  required?: boolean
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onSelectPlace,
  placeholder = 'Buscar dirección...',
  required = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [googleActive, setGoogleActive] = useState(false)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        const useGMSetting = await window.api.settings.get('use_google_maps')
        const apiKeySetting = await window.api.settings.get('google_maps_api_key')
        
        if (useGMSetting?.value === 'true' && apiKeySetting?.value) {
          const google = await loadGoogleMaps()
          if (!inputRef.current) return

          setGoogleActive(true)

          // Evitar doble inicialización
          if (!autocompleteRef.current) {
            const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
              types: ['geocode', 'establishment'],
              componentRestrictions: { country: 'MX' } // Restringir a México (Nuevo Laredo)
            })

            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace()
              if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat()
                const lng = place.geometry.location.lng()
                const address = place.formatted_address || place.name || ''
                
                onSelectPlace({
                  address,
                  lat,
                  lng
                })
              }
            })

            autocompleteRef.current = autocomplete
          }
        } else {
          setGoogleActive(false)
          autocompleteRef.current = null
        }
      } catch (error) {
        console.error('Error al inicializar el autocompletado de direcciones:', error)
      }
    }

    initAutocomplete()
    window.addEventListener('settings-updated', initAutocomplete)

    return () => {
      window.removeEventListener('settings-updated', initAutocomplete)
      if (autocompleteRef.current && window.google?.maps) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-orange-500/50 focus:ring-[4px] focus:ring-orange-500/10 transition-all outline-none font-bold text-slate-900"
      />
      {googleActive && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded border border-emerald-100 pointer-events-none">
          Google Autocomplete Activo
        </span>
      )}
    </div>
  )
}
