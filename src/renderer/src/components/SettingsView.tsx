import { useEffect, useState } from 'react'
import { MapPin, Clock, Settings, ShieldCheck, Calendar, Zap, Save, RefreshCcw, AlertCircle, Trash2 } from 'lucide-react'

interface Holiday {
  date: string;
  reason: string;
}

const SettingsView = () => {
    const [activeTab, setActiveTab] = useState<'warehouse' | 'algorithm' | 'holidays'>('warehouse')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    
    // Configuraciones del almacen
    const [warehouseData, setWarehouseData] = useState({
        address: '',
        coordinates: '',
        opening_time: '08:00',
        closing_time: '18:00',
        avg_unloading_time: 30
    })

    // Configuracion del algoritmo y general
    const [algoData, setAlgoData] = useState({
        popSize: 100,
        numGenerations: 500,
        mutationRate: 0.05,
        maxRoutesPerDay: 10
    })

    // Dias inhabiles (Vacaciones)
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [newHoliday, setNewHoliday] = useState({ date: '', reason: '' })

    const fetchData = async () => {
        setLoading(true)
        try {
            // Cargar almacen
            const wData = await window.api.db.list('warehouse')
            if (wData.length > 0) setWarehouseData(wData[0] as any)

            // Cargar configuracion del algoritmo desde la tabla de configuraciones
            const algoStr = await window.api.settings.get('algorithm_config')
            if (algoStr) setAlgoData(JSON.parse(algoStr.value))

            // Cargar dias inhabiles
            const holidayStr = await window.api.settings.get('non_working_days')
            if (holidayStr) setHolidays(JSON.parse(holidayStr.value))

        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSaveWarehouse = async () => {
        setSaving(true)
        try {
            const existing = await window.api.db.list('warehouse')
            if (existing.length > 0) {
                await window.api.db.update('warehouse', 1, warehouseData)
            } else {
                await window.api.db.create('warehouse', { ...warehouseData, id: 1 })
            }
        } catch (error) {
            console.error('Error saving warehouse:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleSaveAlgorithm = async () => {
        setSaving(true)
        try {
            await window.api.settings.set('algorithm_config', JSON.stringify(algoData))
        } catch (error) {
            console.error('Error saving algorithm:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleSaveHolidays = async (updatedHolidays: Holiday[]) => {
        setSaving(true)
        try {
            await window.api.settings.set('non_working_days', JSON.stringify(updatedHolidays))
            setHolidays(updatedHolidays)
        } catch (error) {
            console.error('Error saving holidays:', error)
        } finally {
            setSaving(false)
        }
    }

    const addHoliday = () => {
        if (!newHoliday.date || !newHoliday.reason) return
        const updated = [...holidays, newHoliday].sort((a,b) => a.date.localeCompare(b.date))
        handleSaveHolidays(updated)
        setNewHoliday({ date: '', reason: '' })
    }

    const removeHoliday = (index: number) => {
        const updated = holidays.filter((_, i) => i !== index)
        handleSaveHolidays(updated)
    }

    if (loading) {
        return (
            <div className="p-20 text-center">
                <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando Configuración...</p>
            </div>
        )
    }

    return (
        <div className="w-full mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Seccion de encabezado */}
            <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[3rem] border border-white/40 shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 blur-3xl -mr-40 -mt-40 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="inline-flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full mb-4 border border-indigo-100">
                            <Settings size={14} className="text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Centro de Control</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Configuración Maestra</h1>
                        <p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">
                            Ajusta los parámetros operativos, días inhábiles y configuración del motor de inteligencia lógica.
                        </p>
                    </div>
                    <div className="shrink-0">
                         <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-inner flex flex-col items-center gap-2">
                             <ShieldCheck size={48} className="text-indigo-600 mb-2" />
                             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sistema Protegido</span>
                         </div>
                    </div>
                </div>

                {/* Pestanas */}
                <div className="flex gap-2 mt-12 bg-slate-100/50 p-2 rounded-3xl border border-slate-200/50 w-fit">
                    {[
                        { id: 'warehouse', label: 'Almacén', icon: <MapPin size={18}/> },
                        { id: 'algorithm', label: 'Algoritmo', icon: <Zap size={18}/> },
                        { id: 'holidays', label: 'Días Inhábiles', icon: <Calendar size={18}/> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-200 border border-indigo-100' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Area de contenido */}
            <div className="min-h-[500px]">
                {activeTab === 'warehouse' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <section className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-premium space-y-8">
                            <div className="flex items-center gap-4">
                                <MapPin className="text-indigo-600" size={24}/>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">UBICACIÓN CENTRAL</h3>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección del CEDIS</label>
                                    <input 
                                        type="text" 
                                        value={warehouseData.address}
                                        onChange={e => setWarehouseData({...warehouseData, address: e.target.value})}
                                        className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/50 outline-none font-bold text-slate-900 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Coordenadas (Lat, Lng)</label>
                                    <input 
                                        type="text" 
                                        value={warehouseData.coordinates}
                                        onChange={e => setWarehouseData({...warehouseData, coordinates: e.target.value})}
                                        className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/50 outline-none font-bold text-slate-900 transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-premium space-y-8 flex flex-col justify-between">
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <Clock className="text-indigo-600" size={24}/>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">LIMITES OPERATIVOS</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apertura</label>
                                        <input type="time" value={warehouseData.opening_time} onChange={e => setWarehouseData({...warehouseData, opening_time: e.target.value})} className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/50 outline-none font-black text-slate-900 transition-all text-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cierre</label>
                                        <input type="time" value={warehouseData.closing_time} onChange={e => setWarehouseData({...warehouseData, closing_time: e.target.value})} className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/50 outline-none font-black text-slate-900 transition-all text-xl" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiempo de Regreso (min)</label>
                                    <input type="number" value={warehouseData.avg_unloading_time} onChange={e => setWarehouseData({...warehouseData, avg_unloading_time: parseInt(e.target.value) || 0})} className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/50 outline-none font-bold text-slate-900 transition-all" />
                                </div>
                            </div>
                            <button onClick={handleSaveWarehouse} disabled={saving} className="bg-indigo-600 text-white w-full py-6 rounded-[2rem] font-black shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50">
                                <Save size={20}/>
                                Actualizar Almacén
                            </button>
                        </section>
                    </div>
                )}

                {activeTab === 'algorithm' && (
                    <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-premium animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-6 mb-12">
                            <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600">
                                <Zap size={32}/>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Parámetros de Inteligencia</h3>
                                <p className="text-slate-500 font-medium tracking-tight">Configura la potencia y precisión del Algoritmo Genético.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { label: 'Población', key: 'popSize', type: 'number', help: 'Número de rutas simultáneas evaluándose' },
                                { label: 'Generaciones', key: 'numGenerations', type: 'number', help: 'Ciclos de evolución por día' },
                                { label: 'Tasa de Mutación', key: 'mutationRate', type: 'number', step: '0.01', help: 'Probabilidad de cambios aleatorios' },
                                { label: 'Max Servicios/Día', key: 'maxRoutesPerDay', type: 'number', help: 'Límite sugerido de paradas' }
                            ].map(item => (
                                <div key={item.key} className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{item.label}</label>
                                    <input 
                                        type={item.type} 
                                        step={item.step}
                                        value={(algoData as any)[item.key]} 
                                        onChange={e => setAlgoData({...algoData, [item.key]: parseFloat(e.target.value) || 0})}
                                        className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/50 outline-none font-black text-slate-900 transition-all text-xl shadow-inner"
                                    />
                                    <p className="text-[10px] text-slate-400 leading-tight italic">{item.help}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 flex items-start gap-6">
                            <AlertCircle className="text-indigo-600 shrink-0 mt-1" size={24}/>
                            <div className="space-y-2">
                                <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">Nota Crítica:</p>
                                <p className="text-sm text-indigo-800 font-medium leading-relaxed">
                                    Valores más altos en <span className="font-black">Población</span> y <span className="font-black">Generaciones</span> aumentan la precisión de las rutas pero requieren más tiempo de cómputo por mes generado.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end mt-12">
                             <button onClick={handleSaveAlgorithm} disabled={saving} className="bg-slate-950 text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl flex items-center gap-3 transition-opacity disabled:opacity-50">
                                <Save size={20}/>
                                Guardar Configuración de Motor
                             </button>
                        </div>
                    </div>
                )}

                {activeTab === 'holidays' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="lg:col-span-1 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-premium h-fit space-y-8">
                             <div className="flex items-center gap-4">
                                <Calendar className="text-emerald-600" size={24}/>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Nuevo Descanso</h3>
                             </div>
                             <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                                    <input 
                                        type="date" 
                                        value={newHoliday.date}
                                        onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
                                        className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500/50 outline-none font-bold text-slate-900 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo / Festividad</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej. Día del Trabajo"
                                        value={newHoliday.reason}
                                        onChange={e => setNewHoliday({...newHoliday, reason: e.target.value})}
                                        className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500/50 outline-none font-bold text-slate-900 transition-all shadow-inner"
                                    />
                                </div>
                                <button onClick={addHoliday} disabled={saving || !newHoliday.date} className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                                    <Calendar size={18}/>
                                    Añadir al Calendario
                                </button>
                             </div>
                        </div>

                        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200 shadow-premium overflow-hidden flex flex-col">
                            <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">Días Inhábiles Guardados</h3>
                                <RefreshCcw size={18} className="text-slate-300 cursor-pointer hover:rotate-180 transition-all duration-700" onClick={fetchData}/>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto max-h-[600px] scrollbar-hide">
                                {holidays.length === 0 ? (
                                    <div className="py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <Calendar size={32} className="text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 font-bold tracking-tight">No hay días inhábiles registrados.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {holidays.map((h, i) => (
                                            <div key={i} className="group p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between hover:bg-white hover:border-indigo-100 transition-all hover:shadow-lg">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        <span className="text-[10px] font-black uppercase leading-none mb-1 opacity-50">Día</span>
                                                        <span className="text-lg font-black leading-none">{h.date.split('-')[2]}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 tracking-tight">{h.reason}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{new Date(h.date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeHoliday(i)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={18}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SettingsView
