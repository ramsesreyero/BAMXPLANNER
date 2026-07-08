import React, { useEffect, useRef } from 'react'
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

const GoogleItemMapModal: React.FC<GoogleItemMapModalProps> = ({ isOpen, onClose, item }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)

  useEffect(() => {
    if (!isOpen || !item || !item.lat || !item.lng || !mapContainerRef.current) return

    let active = true

    const initMap = async () => {
      try {
        const google = await loadGoogleMaps()
        if (!active) return

        const center = { lat: parseFloat(item.lat.toString()), lng: parseFloat(item.lng.toString()) }

        const mapOptions: google.maps.MapOptions = {
          center,
          zoom: 16,
          disableDefaultUI: false, // Keep default UI elements like zoom buttons
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: true, // Allow street view for verification!
          styles: [
            // Subtly styling the map to look premium but highly readable
            {
              "featureType": "all",
              "stylers": [{ "saturation": -20 }]
            }
          ]
        }

        const map = new google.maps.Map(mapContainerRef.current!, mapOptions)
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
      } catch (error) {
        console.error("Error al inicializar Google Maps en Modal:", error)
      }
    }

    initMap()

    return () => {
      active = false
      if (markerRef.current) markerRef.current.setMap(null)
      mapRef.current = null
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
        <div className="flex-1 relative bg-slate-50">
          {item.lat && item.lng ? (
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
          ) : (
            <div className="flex-1 h-full flex items-center justify-center text-slate-400">
              No hay coordenadas registradas
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {item.lat && item.lng ? `Coordenadas: ${parseFloat(item.lat.toString()).toFixed(6)}, ${parseFloat(item.lng.toString()).toFixed(6)}` : 'Sin Ubicación'}
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
                <span>Google Maps</span>
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
