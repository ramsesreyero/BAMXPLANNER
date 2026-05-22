import React from 'react'
import { Truck, X, ChevronRight } from 'lucide-react'

interface RouteCreationModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (e: React.FormEvent) => void
    routeFormData: {
        truck_id: string
        driver_id: string
        type: string
    }
    setRouteFormData: (data: any) => void
    trucks: any[]
    drivers: any[]
}

export const RouteCreationModal: React.FC<RouteCreationModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    routeFormData,
    setRouteFormData,
    trucks,
    drivers
}) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white/90 backdrop-blur-2xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="p-10 border-b border-slate-100/50 relative bg-gradient-to-br from-white to-orange-50/30">
                    <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-600/30">
                        <Truck size={28} className="text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                        Nuevo <span className="text-orange-600">Despliegue</span>
                    </h3>
                    <p className="text-slate-400 text-sm font-medium mt-1">Configura una nueva unidad operativa.</p>
                    <button
                        onClick={onClose}
                        className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-2xl"
                    >
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-10 space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                            Unidad Logística
                        </label>
                        <div className="relative group">
                            <select
                                required
                                value={routeFormData.truck_id}
                                onChange={(e) => setRouteFormData({ ...routeFormData, truck_id: e.target.value })}
                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900 cursor-pointer appearance-none"
                            >
                                {trucks.map(truck => (
                                    <option key={truck.id} value={truck.id}>{truck.name} - {truck.capacity_kg} kg</option>
                                ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronRight size={16} className="rotate-90" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                            Chofer Responsable
                        </label>
                        <div className="relative group">
                            <select
                                required
                                value={routeFormData.driver_id}
                                onChange={(e) => setRouteFormData({ ...routeFormData, driver_id: e.target.value })}
                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900 cursor-pointer appearance-none"
                            >
                                {drivers.map(driver => (
                                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronRight size={16} className="rotate-90" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                            Tipo Operativo
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Entrega', 'Recolección', 'Institucional', 'Caridad'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setRouteFormData({ ...routeFormData, type })}
                                    className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                        routeFormData.type === type 
                                        ? 'bg-slate-900 text-white shadow-lg' 
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
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
                            className="flex-[2] bg-orange-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-orange-500/25 hover:bg-orange-700 transition-all active:scale-[0.98] uppercase text-[11px] tracking-widest"
                        >
                            Iniciar Ruta
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
