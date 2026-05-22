import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Correccion para los marcadores por defecto de Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
})

// Componente para forzar el re-render del mapa cuando el modal se abre (Correccion para Portals)
const MapInvalidator = () => {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [map]);
    return null;
};

export interface ItemMapModalProps {
    isOpen: boolean
    onClose: () => void
    item: {
        name: string
        lat: number
        lng: number
        type: string
    } | null
}

const ItemMapModal: React.FC<ItemMapModalProps> = ({ isOpen, onClose, item }) => {
    if (!isOpen || !item) return null

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl border border-white/20 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[80vh]">
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
                <div className="flex-1 relative bg-slate-50">
                    {(item.lat && item.lng) ? (
                        <MapContainer
                            center={[parseFloat(item.lat.toString()), parseFloat(item.lng.toString())]}
                            zoom={16}
                            scrollWheelZoom={true}
                            style={{ height: '100%', width: '100%' }}
                            className="z-0"
                        >
                            <MapInvalidator />
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            />
                            <Marker position={[parseFloat(item.lat.toString()), parseFloat(item.lng.toString())]}>
                                <Popup>
                                    <div className="font-bold text-slate-900">{item.name}</div>
                                </Popup>
                            </Marker>
                        </MapContainer>
                    ) : (
                        <div className="flex-1 h-full flex items-center justify-center text-slate-400">
                            No hay coordenadas registradas
                        </div>
                    )}
                </div>
                <div className="p-6 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {(item.lat && item.lng) ? `Coordenadas: ${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}` : 'Sin Ubicación'}
                    </p>
                    <div className="space-x-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                        >
                            Cerrar
                        </button>
                        {(item.lat && item.lng) && (
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

export default ItemMapModal
