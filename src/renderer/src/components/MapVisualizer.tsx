import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RouteStop } from '../utils/geneticRouting';
import {
  Truck,
  Building2,
  ShoppingCart,
  PlayCircle
} from 'lucide-react';

// Componente para recentrar el mapa programaticamente
const MapRecenter = ({ lat, lng }: { lat?: number | string; lng?: number | string }) => {
  const map = useMap();
  useEffect(() => {
    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
        try {
            const bLat = parseFloat(lat.toString());
            const bLng = parseFloat(lng.toString());
            if (!isNaN(bLat) && !isNaN(bLng)) {
              map.setView([bLat, bLng], 14, { animate: true });
            }
        } catch (e) {
            console.error("Error in MapRecenter:", e);
        }
    }
  }, [lat, lng, map]);
  return null;
};

// Componente para forzar el re-render del mapa (tiles) cuando el modal se abre
const MapInvalidator = () => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            if (map) {
                try {
                    map.invalidateSize();
                } catch (e) {
                    console.warn("Leaflet map invalidateSize ignored:", e);
                }
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
};

// Correccion para los iconos de Leaflet en React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Iconos personalizados por tipo de parada y por camion
const getIcon = (type: string, truck?: 'A' | 'B') => {
  let color = 'blue';
  if (type === 'warehouse') color = 'red';
  else if (truck === 'A') color = 'orange'; // Camion A es naranja
  else if (truck === 'B') color = 'blue';   // Camion B es azul
  else if (type === 'supermarket') color = 'green';
  else if (type === 'colony' || type === 'institution') color = 'gold';

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

interface MapVisualizerProps {
  route: RouteStop[];
  hideSidebar?: boolean;
}

import { GoogleMapVisualizer } from './GoogleMapVisualizer';

export const MapVisualizer: React.FC<MapVisualizerProps> = ({ route = [], hideSidebar = false }) => {
  console.log("MapVisualizer rendering with route length:", route?.length);
  if (!route) return <div className="p-10 text-slate-500 font-black uppercase text-xs tracking-widest bg-slate-900 h-full flex items-center justify-center">Error: No se proporcionó ruta</div>;

  const [polylineA, setPolylineA] = useState<[number, number][]>([]);
  const [polylineB, setPolylineB] = useState<[number, number][]>([]);
  const [showUnitA, setShowUnitA] = useState(true);
  const [showUnitB, setShowUnitB] = useState(true);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [cedisCoords, setCedisCoords] = useState("27.477850806886945,-99.49498391012905");
  const [useGoogleMaps, setUseGoogleMaps] = useState(false);

  useEffect(() => {
    const fetchCedis = async () => {
      try {
        const setting = await window.api.settings.get('cedis_coords');
        if (setting?.value) {
          setCedisCoords(setting.value);
        }
        
        const useGMSetting = await window.api.settings.get('use_google_maps');
        const apiKeySetting = await window.api.settings.get('google_maps_api_key');
        setUseGoogleMaps(useGMSetting?.value === 'true' && !!apiKeySetting?.value);
      } catch (e) {
        console.error("Error loading CEDIS coordinates in MapVisualizer:", e);
      }
    };
    fetchCedis();
    window.addEventListener('settings-updated', fetchCedis);
    return () => window.removeEventListener('settings-updated', fetchCedis);
  }, []);



  // Calcular cargas acumuladas
  const stopsWithLoad = route.reduce((acc: any[], stop, idx) => {
    const prevLoad = idx === 0 ? 0 : acc[idx - 1].currentLoad;
    const currentLoad = prevLoad + stop.demand;
    acc.push({ ...stop, currentLoad });
    return acc;
  }, []);

  // Logica de simulacion
  useEffect(() => {
    let interval: any;
    if (isSimulating) {
      setSimIndex(0);
      setSelectedStopIndex(0);
      interval = setInterval(() => {
        setSimIndex(prev => {
          if (prev >= stopsWithLoad.length - 1) {
            setIsSimulating(false);
            return prev;
          }
          const next = prev + 1;
          setSelectedStopIndex(next);
          
          // Auto-scroll del sidebar
          const element = document.getElementById(`stop-card-${next}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          
          return next;
        });
      }, 2500); 
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  // Obtener la ruta real dibujada por las calles usando OSRM API (Separada por camion)
  useEffect(() => {
    const fetchFullRoute = async () => {
      if (route.length === 0) return;
      setIsLoadingRoute(true);

      const [latStr, lngStr] = cedisCoords.split(',').map(s => s.trim());
      const baseLngLat = `${lngStr},${latStr}`;
      const controller = new AbortController();

      const fetchTruckRoute = async (truckLetter: 'A' | 'B') => {
        const truckStops = route.filter(s => (s as any).truck === truckLetter && s.lat && s.lng);
        if (truckStops.length === 0) return [];

        const coordsString = `${baseLngLat};` + 
          truckStops.map(s => `${s.lng},${s.lat}`).join(';') + 
          `;${baseLngLat}`;

        try {
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`, {
            signal: controller.signal
          });
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            return data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
          }
        } catch (error) {
          console.error(`Error fetching route for truck ${truckLetter}:`, error);
        }
        return [];
      };

      try {
        const [pA, pB] = await Promise.all([
          fetchTruckRoute('A'),
          fetchTruckRoute('B')
        ]);
        setPolylineA(pA);
        setPolylineB(pB);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchFullRoute();
  }, [route]);

  if (useGoogleMaps) {
    return <GoogleMapVisualizer route={route} hideSidebar={hideSidebar} />;
  }

  const [cLat, cLng] = cedisCoords.split(',').map(s => parseFloat(s.trim()));
  const center: [number, number] = route.length > 0 && route[0].lat && route[0].lng
    ? [parseFloat(route[0].lat.toString()), parseFloat(route[0].lng.toString())]
    : [cLat || 27.4778508, cLng || -99.4949839];

  const currentFocus = selectedStopIndex !== null ? stopsWithLoad[selectedStopIndex] : route[0];

  return (
    <div className="flex flex-col lg:flex-row w-full h-full border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl bg-slate-950 relative isolate">
      {/* Barra lateral - Cristal Pro */}
      {!hideSidebar && (
        <div className="w-full lg:w-96 bg-slate-900 border-r border-white/5 flex flex-col h-1/2 lg:h-full relative overflow-hidden rounded-l-[3rem]">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
        
        <div className="p-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-md relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">
              Hoja de Ruta Optimizada
            </h4>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-white tracking-tighter">
              {route.length} <span className="text-slate-500 text-lg">Paradas</span>
            </p>
          </div>
        </div>
          {isSimulating && (
             <div className="mt-4 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Simulación en curso...</span>
             </div>
          )}
        
        <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scroll-smooth">
          {stopsWithLoad.map((stop, idx) => (
            <div 
              key={idx}
              id={`stop-card-${idx}`}
              onClick={() => {
                if (!isSimulating) {
                  setSelectedStopIndex(idx);
                  setSimIndex(idx);
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

      {/* MAPA */}
      <div className="flex-1 relative z-0 h-full min-h-0 bg-slate-50 overflow-hidden">
        {isLoadingRoute && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-700/50 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] tracking-[0.3em] uppercase shadow-2xl z-[1000] flex items-center gap-4 backdrop-blur-xl">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Analizando infraestructura vial...
          </div>
        )}

        {hideSidebar && (
          <div className="absolute bottom-10 right-10 bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 shadow-2xl z-[1000] flex items-center gap-4 animate-in fade-in duration-300">
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
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Paso {simIndex} de {stopsWithLoad.length - 1}</span>
              </div>
            )}
          </div>
        )}

        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <MapInvalidator />
          {currentFocus && <MapRecenter lat={currentFocus.lat} lng={currentFocus.lng} />}
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {showUnitA && polylineA.length > 0 && (
            <Polyline 
              positions={polylineA} 
              color="#ea580c" // Naranja-600 para camion A
              weight={8} 
              opacity={0.7}
              lineCap="round"
            />
          )}

          {(() => {
            const [cLat, cLng] = cedisCoords.split(',').map(s => parseFloat(s.trim()));
            if (!isNaN(cLat) && !isNaN(cLng)) {
              return (
                <Marker 
                  position={[cLat, cLng]} 
                  icon={getIcon('warehouse')}
                >
                  <Popup className="premium-popup">
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="bg-slate-900 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">Base</span>
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                      </div>
                      <h5 className="font-black text-slate-950 text-base mb-2 uppercase tracking-tight leading-tight">CEDIS BAMX (Almacén Central)</h5>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return null;
          })()}

          {showUnitB && polylineB.length > 0 && (
            <Polyline 
              positions={polylineB} 
              color="#2563eb" // Azul-600 para camion B
              weight={8} 
              opacity={0.7}
              dashArray="2, 16"
              lineCap="round"
            />
          )}

          {stopsWithLoad.map((stop, index) => {
            if (!stop.lat || !stop.lng) return null;
            
            const isVisible = (stop as any).truck === 'A' ? showUnitA : (stop as any).truck === 'B' ? showUnitB : true;
            if (!isVisible) return null;

            return (
              <Marker 
                key={`${stop.id}-${index}`} 
                position={[parseFloat(stop.lat.toString()), parseFloat(stop.lng.toString())]} 
                icon={getIcon(stop.type, (stop as any).truck)}
                eventHandlers={{
                    click: () => {
                        setSelectedStopIndex(index);
                        setSimIndex(index);
                    }
                }}
              >
                <Popup className="premium-popup">
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center justify-between mb-3">
                         <span className="bg-slate-900 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">Paso {index}</span>
                         <div className={`w-3 h-3 rounded-full animate-ping ${
                             stop.type === 'warehouse' ? 'bg-red-500' : 
                             stop.type === 'supermarket' ? 'bg-emerald-500' : 'bg-orange-500'
                         }`} />
                    </div>
                    <h5 className="font-black text-slate-950 text-base mb-2 uppercase tracking-tight leading-tight">{stop.name || `Punto ${stop.id}`}</h5>
                    
                    <div className="space-y-2 mt-4">
                        <div className="bg-slate-900/50 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Truck size={14} className="text-blue-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga</span>
                            </div>
                            <span className="text-xs font-black text-white">
                                {stop.currentLoad} / 1000 kg
                            </span>
                        </div>
                        
                        <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {stop.demand > 0 ? <ShoppingCart size={14} className="text-emerald-400" /> : <Building2 size={14} className="text-orange-400" />}
                                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Operación</span>
                            </div>
                            <span className={`text-xs font-black uppercase ${stop.demand > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                {stop.demand > 0 ? 'Abasto' : stop.demand < 0 ? 'Entrega' : 'Base'}
                            </span>
                        </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* LEYENDA FLOTANTE PREMIUM */}
        <div className="absolute bottom-10 left-10 bg-white/95 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white text-slate-900 shadow-2xl z-[1000] hidden sm:block">
            <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Monitor Logístico</h6>
            <div className="space-y-4">
                <button
                  onClick={() => setShowUnitA(!showUnitA)}
                  className={`flex items-center gap-3 w-full text-left p-1.5 rounded-xl hover:bg-slate-100/80 transition-all ${!showUnitA ? 'opacity-40' : ''}`}
                >
                    <div className="w-10 h-3 bg-orange-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-tight flex-1">Unidad A</span>
                    <input type="checkbox" checked={showUnitA} readOnly className="h-3 w-3 accent-orange-600 rounded cursor-pointer" />
                </button>
                <button
                  onClick={() => setShowUnitB(!showUnitB)}
                  className={`flex items-center gap-3 w-full text-left p-1.5 rounded-xl hover:bg-slate-100/80 transition-all ${!showUnitB ? 'opacity-40' : ''}`}
                >
                    <div className="w-10 h-3 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-tight flex-1">Unidad B</span>
                    <input type="checkbox" checked={showUnitB} readOnly className="h-3 w-3 accent-blue-600 rounded cursor-pointer" />
                </button>
                <div className="flex items-center gap-3 p-1.5">
                    <div className="w-4 h-4 rounded-lg bg-red-500 shadow-lg shadow-red-500/30" />
                    <span className="text-[10px] font-black uppercase tracking-tight">CEDIS BAMX</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
