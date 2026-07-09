import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { loadGoogleMaps } from '../utils/googleMapsLoader'

export interface GoogleItemMapModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    name: string
    lat: number
    lng: number
    type: string
  } | null
}

// ─── Leaflet Map para el modal ────────────────────────────────────────────────
const LeafletItemMap: React.FC<{ lat: number; lng: number; name: string; type: string }> = ({
  lat, lng, name, type
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const initLeaflet = () => {
      const L = (window as any).L
      if (!L || !containerRef.current) return

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

      const center: [number, number] = [lat, lng]
      const map = L.map(containerRef.current, { zoomControl: true }).setView(center, 16)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map)

      // Custom animated marker
      const markerHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="width:28px;height:28px;border-radius:50%;background:#4f46e5;border:3px solid white;box-shadow:0 4px 12px rgba(79,70,229,0.5);animation:drop 0.4s ease;"></div>
          <div style="width:2px;height:12px;background:#4f46e5;opacity:0.5;"></div>
        </div>`
      const icon = L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: [28, 42],
        iconAnchor: [14, 42]
      })

      const marker = L.marker(center, { icon }).addTo(map)

      // Popup with name and type
      marker.bindPopup(`
        <div style="font-family:sans-serif;padding:4px 2px;">
          <div style="font-weight:800;font-size:13px;color:#0f172a;text-transform:uppercase;">${name}</div>
          <div style="font-size:11px;color:#64748b;margin-top:3px;">Tipo: ${type}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
        </div>
      `).openPopup()

      mapRef.current = map
      setTimeout(() => map.invalidateSize(), 100)
    }

    if ((window as any).L) {
      initLeaflet()
    } else {
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
      } else {
        // Script exists but may still be loading — poll briefly
        let attempts = 0
        const interval = setInterval(() => {
          attempts++
          if ((window as any).L) { clearInterval(interval); initLeaflet() }
          if (attempts > 30) clearInterval(interval)
        }, 100)
      }
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [lat, lng])

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}

// ─── Componente principal ─────────────────────────────────────────────────────
const GoogleItemMapModal: React.FC<GoogleItemMapModalProps> = ({ isOpen, onClose, item }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [mapMode, setMapMode] = useState<'loading' | 'google' | 'leaflet'>('loading')

  useEffect(() => {
    if (!isOpen || !item?.lat || !item?.lng) return

    let active = true
    setMapMode('loading')

    const initMap = async () => {
      try {
        const useGMSetting = await window.api.settings.get('use_google_maps')
        const apiKeySetting = await window.api.settings.get('google_maps_api_key')

        if (useGMSetting?.value === 'true' && apiKeySetting?.value) {
          try {
            const google = await loadGoogleMaps()
            if (!active || !mapContainerRef.current) return

            const center = {
              lat: parseFloat(item.lat.toString()),
              lng: parseFloat(item.lng.toString())
            }

            const map = new google.maps.Map(mapContainerRef.current, {
              center,
              zoom: 16,
              zoomControl: true,
              mapTypeControl: true,
              streetViewControl: true,
              styles: [{ featureType: 'all', stylers: [{ saturation: -20 }] }]
            })
            mapRef.current = map

            const marker = new google.maps.Marker({
              position: center,
              map,
              title: item.name,
              animation: google.maps.Animation.DROP
            })
            markerRef.current = marker

            const infoWindow = new google.maps.InfoWindow({
              content: `<div style="padding: 5px; color: #0f172a; font-family: sans-serif;">
                <div style="font-weight: 800; font-size: 13px; text-transform: uppercase;">${item.name}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Tipo: ${item.type}</div>
              </div>`
            })
            infoWindow.open(map, marker)

            if (active) setMapMode('google')
            return
          } catch {
            // fall through to Leaflet
          }
        }

        if (active) setMapMode('leaflet')
      } catch {
        if (active) setMapMode('leaflet')
      }
    }

    initMap()

    return () => {
      active = false
      if (markerRef.current) markerRef.current.setMap(null)
      mapRef.current = null
      markerRef.current = null
    }
  }, [isOpen, item])

  if (!isOpen || !item) return null

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-white/20 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[80vh]">

        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <div className="inline-flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full mb-2 border border-indigo-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                Ubicación de {item.type}
              </span>
              {mapMode === 'leaflet' && (
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 ml-1">
                  OpenStreetMap
                </span>
              )}
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
              {item.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors w-12 h-12 flex items-center justify-center hover:bg-slate-50 rounded-full bg-slate-100/50"
          >
            ✕
          </button>
        </div>

        {/* Map Body */}
        <div className="flex-1 relative bg-slate-50 overflow-hidden">
          {item.lat && item.lng ? (
            <>
              {/* Google Maps container (hidden until mode is confirmed) */}
              {mapMode === 'google' && (
                <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
              )}

              {/* Leaflet fallback */}
              {mapMode === 'leaflet' && (
                <LeafletItemMap
                  lat={parseFloat(item.lat.toString())}
                  lng={parseFloat(item.lng.toString())}
                  name={item.name}
                  type={item.type}
                />
              )}

              {/* Loading state */}
              {mapMode === 'loading' && (
                <div className="flex h-full items-center justify-center bg-slate-100">
                  <p className="text-sm text-slate-400 font-medium animate-pulse">Cargando mapa...</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 h-full flex items-center justify-center text-slate-400">
              No hay coordenadas registradas
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {item.lat && item.lng
              ? `Coordenadas: ${parseFloat(item.lat.toString()).toFixed(6)}, ${parseFloat(item.lng.toString()).toFixed(6)}`
              : 'Sin Ubicación'}
          </p>
          <div className="space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
            >
              Cerrar
            </button>
            {item.lat && item.lng && (
              <a
                href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all text-sm active:scale-95 inline-flex items-center space-x-2"
              >
                <span>Ver en Google Maps</span>
                <span>↗</span>
              </a>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}

export default GoogleItemMapModal
