import React, { useEffect, useRef, useState } from 'react'
import { RouteStop } from '../utils/geneticRouting'
import { loadGoogleMaps } from '../utils/googleMapsLoader'
import {
  PlayCircle
} from 'lucide-react'

interface GoogleMapVisualizerProps {
  route: RouteStop[]
  hideSidebar?: boolean
}

export const GoogleMapVisualizer: React.FC<GoogleMapVisualizerProps> = ({ route = [], hideSidebar = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylinesRef = useRef<google.maps.Polyline[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  const [polylineA, setPolylineA] = useState<[number, number][]>([])
  const [polylineB, setPolylineB] = useState<[number, number][]>([])
  const [showUnitA, setShowUnitA] = useState(true)
  const [showUnitB, setShowUnitB] = useState(true)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simIndex, setSimIndex] = useState(0)
  const [cedisCoords, setCedisCoords] = useState("27.477850806886945,-99.49498391012905")
  const [mapLoaded, setMapLoaded] = useState(false)

  // 1. Cargar coordenadas del CEDIS
  useEffect(() => {
    const fetchCedis = async () => {
      try {
        const setting = await window.api.settings.get('cedis_coords')
        if (setting?.value) {
          setCedisCoords(setting.value)
        }
      } catch (e) {
        console.error("Error loading CEDIS coordinates in GoogleMapVisualizer:", e)
      }
    }
    fetchCedis()
  }, [])

  // 2. Calcular cargas acumuladas
  const stopsWithLoad = route.reduce((acc: any[], stop, idx) => {
    const prevLoad = idx === 0 ? 0 : acc[idx - 1].currentLoad
    const currentLoad = prevLoad + stop.demand
    acc.push({ ...stop, currentLoad })
    return acc
  }, [])

  // 3. Simulación de trayecto
  useEffect(() => {
    let interval: any
    if (isSimulating) {
      setSimIndex(0)
      setSelectedStopIndex(0)
      interval = setInterval(() => {
        setSimIndex(prev => {
          if (prev >= stopsWithLoad.length - 1) {
            setIsSimulating(false)
            return prev
          }
          const next = prev + 1
          setSelectedStopIndex(next)
          
          const element = document.getElementById(`stop-card-${next}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
          return next
        })
      }, 2500)
    }
    return () => clearInterval(interval)
  }, [isSimulating])

  // 4. Obtener coordenadas de calles por OSRM (Gratuito e independiente de cuotas de Google)
  useEffect(() => {
    const fetchFullRoute = async () => {
      if (route.length === 0) return
      setIsLoadingRoute(true)

      const [latStr, lngStr] = cedisCoords.split(',').map(s => s.trim())
      const baseLngLat = `${lngStr},${latStr}`
      const controller = new AbortController()

      const fetchTruckRoute = async (truckLetter: 'A' | 'B') => {
        const truckStops = route.filter(s => (s as any).truck === truckLetter && s.lat && s.lng)
        if (truckStops.length === 0) return []

        const coordsString = `${baseLngLat};` + 
          truckStops.map(s => `${s.lng},${s.lat}`).join(';') + 
          `;${baseLngLat}`

        try {
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`, {
            signal: controller.signal
          })
          const data = await response.json()
          if (data.routes && data.routes.length > 0) {
            return data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
          }
        } catch (error) {
          console.error(`Error fetching OSRM route for truck ${truckLetter}:`, error)
        }
        return []
      }

      try {
        const [pA, pB] = await Promise.all([
          fetchTruckRoute('A'),
          fetchTruckRoute('B')
        ])
        setPolylineA(pA)
        setPolylineB(pB)
      } finally {
        setIsLoadingRoute(false)
      }
    }

    fetchFullRoute()
  }, [route, cedisCoords])

  // 5. Inicializar mapa de Google Maps
  useEffect(() => {
    if (!mapContainerRef.current) return

    let active = true

    const initMap = async () => {
      try {
        const google = await loadGoogleMaps()
        if (!active) return

        const [cLat, cLng] = cedisCoords.split(',').map(s => parseFloat(s.trim()))
        
        let initialCenter = { lat: cLat || 27.4778508, lng: cLng || -99.4949839 }
        if (route.length > 0 && route[0].lat && route[0].lng) {
          initialCenter = { lat: parseFloat(route[0].lat.toString()), lng: parseFloat(route[0].lng.toString()) }
        }

        // Estilos premium oscuros/elegantes
        const mapOptions: google.maps.MapOptions = {
          center: initialCenter,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              "featureType": "all",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#747d8c" }]
            },
            {
              "featureType": "all",
              "elementType": "labels.text.stroke",
              "stylers": [{ "visibility": "on" }, { "color": "#1e272e" }, { "weight": 2 }]
            },
            {
              "featureType": "administrative",
              "elementType": "geometry.fill",
              "stylers": [{ "color": "#2f3542" }]
            },
            {
              "featureType": "landscape",
              "elementType": "geometry",
              "stylers": [{ "color": "#2f3542" }]
            },
            {
              "featureType": "poi",
              "elementType": "geometry",
              "stylers": [{ "color": "#3742fa" }, { "lightness": -80 }]
            },
            {
              "featureType": "road",
              "elementType": "geometry",
              "stylers": [{ "color": "#1e272e" }]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry.fill",
              "stylers": [{ "color": "#2f3542" }]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry.stroke",
              "stylers": [{ "color": "#57606f" }]
            },
            {
              "featureType": "transit",
              "elementType": "geometry",
              "stylers": [{ "color": "#2f3542" }]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [{ "color": "#1b1f24" }]
            }
          ]
        }

        const map = new google.maps.Map(mapContainerRef.current!, mapOptions)
        mapRef.current = map
        infoWindowRef.current = new google.maps.InfoWindow()
        setMapLoaded(true)
      } catch (error) {
        console.error("Error al inicializar el mapa de Google Maps:", error)
      }
    }

    initMap()

    return () => {
      active = false
    }
  }, [cedisCoords])

  // Helper para obtener color de marcador
  const getMarkerColor = (type: string, truck?: 'A' | 'B'): string => {
    if (type === 'warehouse') return '#ef4444' // Rojo
    if (truck === 'A') return '#f97316' // Naranja
    if (truck === 'B') return '#3b82f6' // Azul
    if (type === 'supermarket') return '#10b981' // Verde
    return '#eab308' // Dorado
  }

  // Helper para crear icono SVG para Google Maps
  const createMarkerIcon = (color: string, label: string): google.maps.Icon => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
        <path d="M18 0C8.1 0 0 8.1 0 18c0 12.8 15.6 26.6 17.2 27.8.5.4 1.1.4 1.6 0C20.4 44.6 36 30.8 36 18c0-9.9-8.1-18-18-18z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="18" cy="18" r="9" fill="#ffffff"/>
        <text x="18" y="21" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="900" fill="${color}" text-anchor="middle">${label}</text>
      </svg>
    `
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(30, 38),
      anchor: new google.maps.Point(15, 38)
    }
  }

  // 6. Dibujar marcadores y polilíneas en Google Maps
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    const google = window.google
    const map = mapRef.current

    // Limpiar marcadores viejos
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // Limpiar polilíneas viejas
    polylinesRef.current.forEach(p => p.setMap(null))
    polylinesRef.current = []

    // A. Dibujar Polilínea A (Unidad A - Sólida Naranja)
    if (showUnitA && polylineA.length > 0) {
      const pathA = polylineA.map(p => ({ lat: p[0], lng: p[1] }))
      const polyA = new google.maps.Polyline({
        path: pathA,
        geodesic: true,
        strokeColor: '#ea580c',
        strokeOpacity: 0.8,
        strokeWeight: 6,
        map: map
      })
      polylinesRef.current.push(polyA)
    }

    // B. Dibujar Polilínea B (Unidad B - Punteada Azul)
    if (showUnitB && polylineB.length > 0) {
      const pathB = polylineB.map(p => ({ lat: p[0], lng: p[1] }))
      
      const lineSymbol = {
        path: 'M 0,-1 0,1',
        strokeOpacity: 1,
        scale: 3
      }

      const polyB = new google.maps.Polyline({
        path: pathB,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0, // Opacidad 0 para ocultar la línea base
        icons: [{
          icon: lineSymbol,
          offset: '0',
          repeat: '15px'
        }],
        map: map
      })
      polylinesRef.current.push(polyB)
    }

    // C. Dibujar Marcador CEDIS
    const [cLat, cLng] = cedisCoords.split(',').map(s => parseFloat(s.trim()))
    if (!isNaN(cLat) && !isNaN(cLng)) {
      const cedisMarker = new google.maps.Marker({
        position: { lat: cLat, lng: cLng },
        map: map,
        icon: createMarkerIcon('#ef4444', 'C'),
        title: 'CEDIS BAMX'
      })

      cedisMarker.addListener('click', () => {
        if (!infoWindowRef.current) return
        infoWindowRef.current.setContent(`
          <div style="padding: 10px; color: #1e293b; font-family: sans-serif; min-width: 150px;">
            <div style="font-weight: 900; text-transform: uppercase; font-size: 11px; color: #ef4444; margin-bottom: 4px;">Almacén Central</div>
            <div style="font-weight: 800; font-size: 13px;">CEDIS BAMX</div>
          </div>
        `)
        infoWindowRef.current.open(map, cedisMarker)
      })

      markersRef.current.push(cedisMarker)
    }

    // D. Dibujar Marcadores de las Paradas
    stopsWithLoad.forEach((stop, index) => {
      if (!stop.lat || !stop.lng) return

      const isVisible = stop.truck === 'A' ? showUnitA : stop.truck === 'B' ? showUnitB : true
      if (!isVisible) return

      const color = getMarkerColor(stop.type, stop.truck)
      const marker = new google.maps.Marker({
        position: { lat: parseFloat(stop.lat.toString()), lng: parseFloat(stop.lng.toString()) },
        map: map,
        icon: createMarkerIcon(color, index.toString()),
        title: stop.name
      })

      marker.addListener('click', () => {
        setSelectedStopIndex(index)
        setSimIndex(index)
        
        if (!infoWindowRef.current) return
        const opName = stop.demand > 0 ? 'Abasto' : stop.demand < 0 ? 'Entrega' : 'Base'
        const opColor = stop.demand > 0 ? '#10b981' : '#f97316'

        infoWindowRef.current.setContent(`
          <div style="padding: 10px; color: #1e293b; font-family: sans-serif; min-width: 200px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="background: #0f172a; color: white; padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 10px; text-transform: uppercase;">Paso ${index}</span>
              <span style="color: ${opColor}; font-weight: 900; font-size: 10px; text-transform: uppercase;">${opName}</span>
            </div>
            <div style="font-weight: 900; font-size: 14px; margin-bottom: 8px; text-transform: uppercase;">${stop.name || `Punto ${stop.id}`}</div>
            <div style="font-size: 12px; margin-top: 4px; font-weight: bold; color: #64748b;">
              Carga actual: ${stop.currentLoad} / 1000 kg
            </div>
            <div style="font-size: 12px; font-weight: bold; color: ${opColor}; margin-top: 2px;">
              Operación: ${Math.abs(stop.demand)} kg
            </div>
          </div>
        `)
        infoWindowRef.current.open(map, marker)
      })

      markersRef.current.push(marker)
    })

  }, [mapLoaded, polylineA, polylineB, route, cedisCoords, showUnitA, showUnitB])

  // 7. Recentrar mapa en el punto seleccionado
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const currentFocus = selectedStopIndex !== null ? stopsWithLoad[selectedStopIndex] : route[0]
    if (currentFocus && currentFocus.lat && currentFocus.lng) {
      mapRef.current.panTo({
        lat: parseFloat(currentFocus.lat.toString()),
        lng: parseFloat(currentFocus.lng.toString())
      })
      mapRef.current.setZoom(15)
    }
  }, [selectedStopIndex, mapLoaded])


  return (
    <div className="flex flex-col lg:flex-row w-full h-full border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl bg-slate-950 relative isolate">
      {/* Barra lateral */}
      {!hideSidebar && (
        <div className="w-full lg:w-96 bg-slate-900 border-r border-white/5 flex flex-col h-1/2 lg:h-full relative overflow-hidden rounded-l-[3rem]">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
        
        <div className="p-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-md relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">
              Hoja de Ruta (Google Maps)
            </h4>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-white tracking-tighter">
              {route.length} <span className="text-slate-500 text-lg">Paradas</span>
            </p>
          </div>
          {isSimulating && (
             <div className="mt-4 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Simulación en curso...</span>
             </div>
          )}
        </div>
        
        <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scroll-smooth">
          {stopsWithLoad.map((stop, idx) => (
            <div 
              key={idx}
              id={`stop-card-${idx}`}
              onClick={() => {
                if (!isSimulating) {
                  setSelectedStopIndex(idx)
                  setSimIndex(idx)
                }
              }}
              className={`group p-5 rounded-[2rem] cursor-pointer transition-all duration-500 border ${
                selectedStopIndex === idx 
                ? 'bg-blue-600 border-blue-400 shadow-2xl shadow-blue-500/40 translate-x-3 scale-[1.02]' 
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
              } ${isSimulating && simIndex === idx ? 'ring-4 ring-blue-500/30 ring-offset-4 ring-offset-slate-900' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform duration-500 ${
                  selectedStopIndex === idx ? 'bg-white text-blue-600 rotate-12' : 'bg-slate-700 text-slate-400'
                }`}>
                  {idx}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1.5 ">
                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${
                      selectedStopIndex === idx ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      {stop.type}
                    </span>
                    {stop.demand !== 0 && (
                      <div className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                        stop.demand > 0 
                        ? (selectedStopIndex === idx ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400') 
                        : (selectedStopIndex === idx ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-400')
                      }`}>
                        {stop.demand > 0 ? '+' : ''}{stop.demand} kg
                      </div>
                    )}
                  </div>
                  <p className={`font-black text-base truncate ${
                    selectedStopIndex === idx ? 'text-white' : 'text-slate-200'
                  }`}>
                    {stop.name || `Punto ${stop.id}`}
                  </p>
                  
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                            selectedStopIndex === idx ? 'bg-white' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, (stop.currentLoad / 1000) * 100)}%` }} 
                      />
                    </div>
                    <span className={`text-[10px] font-black whitespace-nowrap uppercase tracking-tighter ${
                        selectedStopIndex === idx ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      {stop.currentLoad} / 1000 kg
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 backdrop-blur-md shrink-0 rounded-bl-[3rem]">
            <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 ${
                    isSimulating 
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                }`}
            >
                {isSimulating ? (
                    <>
                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                        Detener Simulación
                    </>
                ) : (
                    <>
                        <PlayCircle size={20} />
                        Simular Trayecto Completo
                    </>
                )}
            </button>
        </div>
      </div>
      )}

      {/* MAPA DE GOOGLE */}
      <div className="flex-1 relative z-0 h-full min-h-0 bg-slate-900 overflow-hidden">
        {isLoadingRoute && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-700/50 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] tracking-[0.3em] uppercase shadow-2xl z-[1000] flex items-center gap-4 backdrop-blur-xl">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Analizando infraestructura vial...
          </div>
        )}

        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

        {hideSidebar && (
          <div className="absolute bottom-10 right-10 bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 shadow-2xl z-[1000] flex items-center gap-4">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 ${
                isSimulating 
                  ? 'bg-red-600 text-white hover:bg-red-500 shadow-xl shadow-red-600/20' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20'
              }`}
            >
              {isSimulating ? 'Detener Simulación' : 'Simular Trayecto'}
            </button>
            {isSimulating && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Paso {simIndex} de {stopsWithLoad.length - 1}</span>
              </div>
            )}
          </div>
        )}

        {/* LEYENDA FLOTANTE */}
        <div className="absolute bottom-10 left-10 bg-slate-900/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 text-white shadow-2xl z-[1000] hidden sm:block">
            <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Monitor Logístico (Google)</h6>
            <div className="space-y-4">
                <button
                  onClick={() => setShowUnitA(!showUnitA)}
                  className={`flex items-center gap-3 w-full text-left p-1.5 rounded-xl hover:bg-white/10 transition-all ${!showUnitA ? 'opacity-40' : ''}`}
                >
                    <div className="w-10 h-3 bg-orange-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-300 flex-1">Unidad A</span>
                    <input type="checkbox" checked={showUnitA} readOnly className="h-3 w-3 accent-orange-600 rounded cursor-pointer" />
                </button>
                <button
                  onClick={() => setShowUnitB(!showUnitB)}
                  className={`flex items-center gap-3 w-full text-left p-1.5 rounded-xl hover:bg-white/10 transition-all ${!showUnitB ? 'opacity-40' : ''}`}
                >
                    <div className="w-10 h-3 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-300 flex-1">Unidad B</span>
                    <input type="checkbox" checked={showUnitB} readOnly className="h-3 w-3 accent-blue-600 rounded cursor-pointer" />
                </button>
                <div className="flex items-center gap-3 p-1.5">
                    <div className="w-4 h-4 rounded-lg bg-red-500 shadow-lg shadow-red-500/30" />
                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-300">CEDIS BAMX</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
export default GoogleMapVisualizer
