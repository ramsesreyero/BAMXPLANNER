import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { loadGoogleMaps } from '../utils/googleMapsLoader'
import { MapPin } from 'lucide-react'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelectPlace: (place: { address: string; lat: number; lng: number }) => void
  placeholder?: string
  required?: boolean
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    suburb?: string
    city?: string
    state?: string
  }
}

function formatNominatimLabel(result: NominatimResult): { title: string; subtitle: string } {
  const displayNameParts = result.display_name.split(', ')

  // Define broad administrative components we want to keep out of the bold title
  const broadTerms = ['nuevo laredo', 'tamaulipas', 'mexico', 'méxico']

  // Find the first part in display_name that is not a broad term
  let title = 'Ubicación'
  let matchedIndex = -1

  for (let i = 0; i < displayNameParts.length; i++) {
    const partLower = displayNameParts[i].toLowerCase()
    if (!broadTerms.some(term => partLower.includes(term))) {
      title = displayNameParts[i]
      matchedIndex = i
      break
    }
  }

  // If everything matches a broad term, fallback to first part
  if (matchedIndex === -1 && displayNameParts.length > 0) {
    title = displayNameParts[0]
    matchedIndex = 0
  }

  // Construct subtitle from the remaining parts
  const subtitleParts = displayNameParts.filter((_, idx) => idx !== matchedIndex)
  const subtitle = subtitleParts.slice(0, 3).join(', ')

  return { title, subtitle }
}

// ─── Portal dropdown rendered directly on <body> to escape Leaflet z-context ──
interface DropdownPortalProps {
  anchorRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  visible: boolean
}

const DropdownPortal: React.FC<DropdownPortalProps> = ({ anchorRef, children, visible }) => {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!visible || !anchorRef.current) return
    const update = () => {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [visible, anchorRef])

  if (!visible || !rect) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      }}
    >
      {children}
    </div>,
    document.body
  )
}

// ─── Nominatim Autocomplete (Fallback gratuito via OpenStreetMap) ─────────────
const NominatimAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onSelectPlace,
  placeholder = 'Buscar dirección...',
  required = false
}) => {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showList, setShowList] = useState(false)
  const [focused, setFocused] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([])
      setShowList(false)
      return
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    try {
      const fullQuery = `${query}, Nuevo Laredo, Tamaulipas`
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=7&countrycodes=mx&addressdetails=1`
      const response = await fetch(url, {
        signal: abortRef.current.signal,
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'BAMX-Nuevo-Laredo-Planner/1.0'
        }
      })
      if (!response.ok) return
      const data: NominatimResult[] = await response.json()
      setSuggestions(data)
      setShowList(data.length > 0)
    } catch (e: any) {
      if (e.name !== 'AbortError') setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350)
  }

  const handleSelect = (result: NominatimResult) => {
    const address = result.display_name
    const { title } = formatNominatimLabel(result)
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    onChange(title)
    onSelectPlace({ address, lat, lng })
    setShowList(false)
    setSuggestions([])
  }

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setShowList(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => {
          setFocused(true)
          if (suggestions.length > 0) setShowList(true)
          if (value.trim().length >= 2) fetchSuggestions(value)
        }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        required={required}
        className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-sky-500/50 focus:ring-[4px] focus:ring-sky-500/10 transition-all outline-none font-bold text-slate-900"
      />

      {/* Badge de modo */}
      <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border pointer-events-none transition-all ${
        loading
          ? 'text-slate-500 bg-slate-50 border-slate-200 animate-pulse'
          : focused
            ? 'text-sky-700 bg-sky-50 border-sky-200'
            : 'text-slate-400 bg-slate-50 border-slate-100'
      }`}>
        {loading ? 'Buscando...' : 'OpenStreetMap'}
      </span>

      {/* Portal dropdown — escapes Leaflet's z-index stacking context */}
      <DropdownPortal anchorRef={inputRef as React.RefObject<HTMLElement>} visible={showList && suggestions.length > 0}>
        <ul className="rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto">
          {suggestions.map((result, i) => {
            const { title, subtitle } = formatNominatimLabel(result)
            return (
              <li
                key={i}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(result) }}
                className="flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-sky-50 border-b border-slate-100 last:border-0 group transition-colors"
              >
                <MapPin size={14} className="mt-0.5 text-slate-300 group-hover:text-sky-500 shrink-0 transition-colors" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-sky-800 leading-tight truncate">
                    {title}
                  </p>
                  {subtitle && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
                  )}
                </div>
              </li>
            )
          })}
          <li className="px-5 py-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 sticky bottom-0">
            © OpenStreetMap contributors
          </li>
        </ul>
      </DropdownPortal>

      {/* Hint when typing too short */}
      {focused && !showList && !loading && value.trim().length > 0 && value.trim().length < 2 && (
        <DropdownPortal anchorRef={inputRef as React.RefObject<HTMLElement>} visible>
          <div className="rounded-2xl border border-slate-100 bg-white shadow-lg px-5 py-3">
            <p className="text-xs text-slate-400 font-medium">Escribe al menos 2 caracteres para buscar...</p>
          </div>
        </DropdownPortal>
      )}
    </div>
  )
}

// ─── Google Places Autocomplete ───────────────────────────────────────────────
const GoogleAutocomplete: React.FC<AddressAutocompleteProps & { onFallback: () => void }> = ({
  value,
  onChange,
  onSelectPlace,
  onFallback,
  placeholder = 'Buscar dirección...',
  required = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const google = await loadGoogleMaps()
        if (!inputRef.current || autocompleteRef.current) return

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'MX' }
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()
            const address = place.formatted_address || place.name || ''
            onSelectPlace({ address, lat, lng })
          }
        })

        autocompleteRef.current = autocomplete
      } catch (error) {
        console.warn('Google Places Autocomplete no disponible, cambiando a Nominatim:', error)
        onFallback()
      }
    }

    init()

    const handleFailed = () => onFallback()
    window.addEventListener('google-maps-failed', handleFailed)

    return () => {
      window.removeEventListener('google-maps-failed', handleFailed)
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
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded border border-emerald-100 pointer-events-none">
        Google Activo
      </span>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = (props) => {
  const [mode, setMode] = useState<'loading' | 'google' | 'nominatim'>('loading')

  useEffect(() => {
    const check = async () => {
      try {
        const useGMSetting = await window.api.settings.get('use_google_maps')
        const apiKeySetting = await window.api.settings.get('google_maps_api_key')
        const shouldUseGoogle = useGMSetting?.value === 'true' && Boolean(apiKeySetting?.value)
        setMode(shouldUseGoogle ? 'google' : 'nominatim')
      } catch {
        setMode('nominatim')
      }
    }

    check()
    window.addEventListener('settings-updated', check)

    const handleFailed = () => {
      console.warn('[AddressAutocomplete] google-maps-failed → cambiando a Nominatim')
      setMode('nominatim')
    }
    window.addEventListener('google-maps-failed', handleFailed)

    return () => {
      window.removeEventListener('settings-updated', check)
      window.removeEventListener('google-maps-failed', handleFailed)
    }
  }, [])

  if (mode === 'loading') {
    return (
      <div className="relative w-full">
        <input
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder || 'Buscar dirección...'}
          required={props.required}
          className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm outline-none font-bold text-slate-900"
        />
      </div>
    )
  }

  if (mode === 'google') {
    return <GoogleAutocomplete {...props} onFallback={() => setMode('nominatim')} />
  }

  return <NominatimAutocomplete {...props} />
}
