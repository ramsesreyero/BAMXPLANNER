import React from 'react'
import { MapPin, X, ChevronRight } from 'lucide-react'

interface StopAdditionModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (e: React.FormEvent) => void
    selectedSuggestion: any
    routes: any[]
    stopFormData: { route_id: string }
    setStopFormData: (data: { route_id: string }) => void
}

export const StopAdditionModal: React.FC<StopAdditionModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    selectedSuggestion,
    routes,
    stopFormData,
    setStopFormData
}) => {
    if (!isOpen || !selectedSuggestion) return null

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white/90 backdrop-blur-2xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="p-10 border-b border-slate-100/50 relative bg-gradient-to-br from-white to-orange-50/30">
                    <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-orange-200">
                        <MapPin size={28} className="text-orange-600" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                        Vincular <span className="text-orange-600">Lugar</span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-2xl"
                    >
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-10 space-y-8">
                    <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/50 blur-2xl -mr-12 -mt-12 group-hover:bg-orange-100/50 transition-colors" />
                        <p className="relative text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-3">Selección</p>
                        <p className="relative text-xl font-black text-slate-900 line-clamp-1 truncate">{selectedSuggestion.name}</p>
                        <p className="relative text-xs font-bold text-slate-400 mt-1 uppercase">{selectedSuggestion.type}</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                            Ruta Destino
                        </label>
                        {routes.filter(r => r.status !== 'Completada').length === 0 ? (
                            <div className="p-6 text-center text-red-500 font-bold bg-red-50/50 border border-red-100 rounded-3xl">
                                No hay rutas activas. Crea una primero.
                            </div>
                        ) : (
                            <div className="relative">
                                <select
                                    required
                                    value={stopFormData.route_id}
                                    onChange={(e) => setStopFormData({ ...stopFormData, route_id: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900 cursor-pointer appearance-none"
                                >
                                    {routes.filter(r => r.status !== 'Completada').map(r => (
                                        <option key={r.id} value={r.id}>{r.truck_name} ({r.driver_name})</option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronRight size={16} className="rotate-90" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 flex items-center gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all uppercase text-[11px] tracking-widest"
                        >
                            Cerrar
                        </button>
                        <button
                            type="submit"
                            disabled={routes.length === 0}
                            className="flex-[2] bg-orange-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-orange-500/25 hover:bg-orange-700 transition-all active:scale-[0.98] disabled:opacity-50 uppercase text-[11px] tracking-widest"
                        >
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
