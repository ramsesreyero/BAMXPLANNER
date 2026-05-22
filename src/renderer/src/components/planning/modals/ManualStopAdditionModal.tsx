import React from 'react'
import { Search, X, ChevronRight } from 'lucide-react'

interface ManualStopAdditionModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (e: React.FormEvent) => void
    manualAddData: { type: string; id: string }
    setManualAddData: (data: { type: string; id: string }) => void
    manualOptions: any[]
    loadManualOptions: (type: string) => void
    routes: any[]
    stopFormData: { route_id: string }
    setStopFormData: (data: { route_id: string }) => void
}

export const ManualStopAdditionModal: React.FC<ManualStopAdditionModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    manualAddData,
    setManualAddData,
    manualOptions,
    loadManualOptions,
    routes,
    stopFormData,
    setStopFormData
}) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white/90 backdrop-blur-2xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="p-10 border-b border-slate-100/50 relative bg-gradient-to-br from-white to-slate-50">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                        <Search size={28} className="text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                        Registro <span className="text-orange-600">Manual</span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-2xl"
                    >
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-10 space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tipo de Punto</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Colonia', 'Institución', 'Supermercado'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => loadManualOptions(type)}
                                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${
                                        manualAddData.type === type 
                                        ? 'bg-orange-600 text-white shadow-lg' 
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Seleccionar Destino</label>
                        <div className="relative">
                            <select
                                required
                                value={manualAddData.id}
                                onChange={(e) => setManualAddData({ ...manualAddData, id: e.target.value })}
                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 transition-all outline-none font-bold text-slate-900 cursor-pointer appearance-none"
                            >
                                {manualOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronRight size={16} className="rotate-90" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Ruta Asignada</label>
                        <div className="relative">
                            <select
                                required
                                value={stopFormData.route_id}
                                onChange={(e) => setStopFormData({ ...stopFormData, route_id: e.target.value })}
                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 transition-all outline-none font-bold text-slate-900 cursor-pointer appearance-none"
                            >
                                {routes.filter(r => r.status !== 'Completada').map(r => (
                                    <option key={r.id} value={r.id}>{r.truck_name} ({r.driver_name})</option>
                                ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronRight size={16} className="rotate-90" />
                            </div>
                        </div>
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
                            disabled={manualOptions.length === 0 || routes.length === 0}
                            className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 uppercase text-[11px] tracking-widest"
                        >
                            Agregar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
