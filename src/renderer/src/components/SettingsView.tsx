import { useEffect, useState } from 'react'
import { MapPin, Clock, Settings, ShieldCheck, Calendar, Zap, Save, RefreshCcw, AlertCircle, Trash2, Database, Download, Upload, User, Map } from 'lucide-react'

interface Holiday {
  date: string;
  reason: string;
}

const SettingsView = () => {
    const [activeTab, setActiveTab] = useState<'warehouse' | 'algorithm' | 'holidays' | 'backup' | 'profile' | 'maps'>('profile')
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
    
    // Nombre de usuario
    const [userName, setUserName] = useState('Christian')

    // Configuración de Google Maps
    const [useGoogleMaps, setUseGoogleMaps] = useState('false')
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState('')
    const [verifyStatus, setVerifyStatus] = useState<{ success?: boolean; message: string } | null>(null)
    const [verifyLoading, setVerifyLoading] = useState(false)
    const [isTutorialOpen, setIsTutorialOpen] = useState(false)
    const [savedUseGoogleMaps, setSavedUseGoogleMaps] = useState('false')
    const [savedGoogleMapsApiKey, setSavedGoogleMapsApiKey] = useState('')

    const fetchData = async () => {
        setLoading(true)
        try {
            // Cargar almacen
            const wData = await window.api.db.list('warehouse')
            if (wData.length > 0) {
                setWarehouseData(wData[0] as any)
            } else {
                // Si la tabla warehouse esta vacia, intentar leer de settings
                const addrStr = await window.api.settings.get('cedis_address')
                const coordsStr = await window.api.settings.get('cedis_coords')
                setWarehouseData(prev => ({
                    ...prev,
                    address: addrStr?.value || 'C. Iturbide 1407, San José, 88230 Nuevo Laredo, Tamps.',
                    coordinates: coordsStr?.value || '27.477850806886945, -99.49498391012905'
                }))
            }

            // Cargar configuracion del algoritmo desde la tabla de configuraciones
            const algoStr = await window.api.settings.get('algorithm_config')
            if (algoStr) setAlgoData(JSON.parse(algoStr.value))

            // Cargar dias inhabiles
            const holidayStr = await window.api.settings.get('non_working_days')
            if (holidayStr) setHolidays(JSON.parse(holidayStr.value))

            // Cargar nombre de usuario
            const userStr = await window.api.settings.get('user_name')
            if (userStr) {
                setUserName(userStr.value)
            } else {
                setUserName('Christian')
            }

            // Cargar Google Maps Settings
            const useGMSetting = await window.api.settings.get('use_google_maps')
            if (useGMSetting) {
                setUseGoogleMaps(useGMSetting.value)
                setSavedUseGoogleMaps(useGMSetting.value)
            }
            
            const apiKeySetting = await window.api.settings.get('google_maps_api_key')
            if (apiKeySetting) {
                setGoogleMapsApiKey(apiKeySetting.value)
                setSavedGoogleMapsApiKey(apiKeySetting.value)
            }

        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            await window.api.settings.set('user_name', userName)
            window.dispatchEvent(new Event('settings-updated'))
            alert('¡Perfil guardado exitosamente!')
        } catch (error: any) {
            console.error('Error saving profile:', error)
            alert('Error al guardar el perfil: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleSaveWarehouse = async () => {
        setSaving(true)
        try {
            const existing = await window.api.db.list('warehouse')
            if (existing.length > 0) {
                await window.api.db.update('warehouse', 1, warehouseData)
            } else {
                await window.api.db.create('warehouse', { ...warehouseData, id: 1 })
            }
            // Sincronizar en settings para que la generacion de rutas y otros componentes lo lean
            await window.api.settings.set('cedis_address', warehouseData.address)
            await window.api.settings.set('cedis_coords', warehouseData.coordinates)
            alert('¡Configuración de Almacén guardada exitosamente!')
        } catch (error: any) {
            console.error('Error saving warehouse:', error)
            alert('Error al guardar la configuración del almacén: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleSaveAlgorithm = async () => {
        setSaving(true)
        try {
            await window.api.settings.set('algorithm_config', JSON.stringify(algoData))
            alert('¡Configuración del Motor guardada exitosamente!')
        } catch (error: any) {
            console.error('Error saving algorithm:', error)
            alert('Error al guardar la configuración del motor: ' + error.message)
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

    const handleSaveGoogleMaps = async () => {
        setSaving(true)
        try {
            await window.api.settings.set('use_google_maps', useGoogleMaps)
            await window.api.settings.set('google_maps_api_key', googleMapsApiKey)
            setSavedUseGoogleMaps(useGoogleMaps)
            setSavedGoogleMapsApiKey(googleMapsApiKey)
            window.dispatchEvent(new Event('settings-updated'))
            alert('¡Configuración de Google Maps guardada exitosamente!')
        } catch (error: any) {
            console.error('Error saving Google Maps settings:', error)
            alert('Error al guardar la configuración: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleVerifyApiKey = async () => {
        if (!googleMapsApiKey) {
            setVerifyStatus({ success: false, message: 'Por favor, ingresa una clave API.' })
            return
        }
        setVerifyLoading(true)
        setVerifyStatus(null)
        try {
            const res = await window.api.googleMaps.verifyKey(googleMapsApiKey)
            setVerifyStatus(res)
        } catch (e: any) {
            setVerifyStatus({ success: false, message: e.message || 'Error al conectar.' })
        } finally {
            setVerifyLoading(false)
        }
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
                        { id: 'profile', label: 'Perfil', icon: <User size={18}/> },
                        { id: 'warehouse', label: 'Almacén', icon: <MapPin size={18}/> },
                        { id: 'maps', label: 'Google Maps', icon: <Map size={18}/> },
                        { id: 'algorithm', label: 'Algoritmo', icon: <Zap size={18}/> },
                        { id: 'holidays', label: 'Días Inhábiles', icon: <Calendar size={18}/> },
                        { id: 'backup', label: 'Base de Datos', icon: <Database size={18}/> }
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
                {activeTab === 'profile' && (
                    <div className="max-w-2xl bg-white p-10 rounded-[3rem] border border-slate-200 shadow-premium space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600">
                                <User size={24}/>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Perfil de Usuario</h3>
                                <p className="text-slate-500 font-medium tracking-tight">Administra la información de tu cuenta local.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de Usuario</label>
                                <input 
                                    type="text" 
                                    value={userName}
                                    onChange={e => setUserName(e.target.value)}
                                    placeholder="Christian"
                                    className="w-full px-8 py-5 rounded-[2rem] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/50 outline-none font-bold text-slate-900 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <button onClick={handleSaveProfile} disabled={saving} className="bg-indigo-600 text-white w-full py-6 rounded-[2rem] font-black shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50">
                            <Save size={20}/>
                            Guardar Perfil
                        </button>
                    </div>
                )}

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

                {activeTab === 'maps' && (
                    <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-premium animate-in fade-in slide-in-from-right-4 duration-500 max-w-3xl space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-4">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600">
                                    <Map size={32}/>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Configuración de Mapas</h3>
                                    <p className="text-slate-500 font-medium tracking-tight">Activa Google Maps para autocompletado y cálculo de distancias por tráfico.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTutorialOpen(true)}
                                className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0 flex items-center gap-2"
                            >
                                📖 Ver Guía Paso a Paso
                            </button>
                        </div>

                        {/* Estado de la Vinculación */}
                        {savedUseGoogleMaps === 'true' && savedGoogleMapsApiKey ? (
                            <div className="p-6 bg-emerald-50/70 border border-emerald-100 rounded-3xl flex items-center justify-between animate-in fade-in duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">
                                        ✓
                                    </div>
                                    <div className="text-left">
                                        <h5 className="text-xs font-black text-emerald-950 uppercase tracking-tight">Google Maps Activo y Vinculado</h5>
                                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5">El autocompletado y el cálculo de distancias están operando a través de Google Cloud.</p>
                                    </div>
                                </div>
                                <span className="px-3.5 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl">
                                    En Línea
                                </span>
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-black">
                                        !
                                    </div>
                                    <div className="text-left">
                                        <h5 className="text-xs font-black text-slate-950 uppercase tracking-tight">Modo Gratuito (OpenStreetMap)</h5>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">La aplicación está utilizando el mapa libre de Leaflet y OSRM.</p>
                                    </div>
                                </div>
                                <span className="px-3.5 py-1.5 bg-slate-400 text-white text-[9px] font-black uppercase tracking-wider rounded-xl">
                                    Desconectado
                                </span>
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Toggle Switch */}
                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all duration-300">
                                <div>
                                    <h4 className="text-base font-black text-slate-950 uppercase tracking-tight">Habilitar Google Maps</h4>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Si está apagado, se utilizará el mapa de OpenStreetMap (Leaflet/OSRM) de forma gratuita.</p>
                                </div>
                                <select 
                                    value={useGoogleMaps} 
                                    onChange={e => setUseGoogleMaps(e.target.value)}
                                    className="px-6 py-4 rounded-2xl bg-white border border-slate-200 font-black text-xs uppercase tracking-widest outline-none cursor-pointer text-slate-900"
                                >
                                    <option value="false">Desactivado (Gratuito)</option>
                                    <option value="true">Activado (Google Maps)</option>
                                </select>
                            </div>

                            {/* API Key Input */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Google Maps API Key</label>
                                <div className="flex gap-4">
                                    <input 
                                        type="password" 
                                        value={googleMapsApiKey}
                                        onChange={e => setGoogleMapsApiKey(e.target.value)}
                                        placeholder="AIzaSy..."
                                        className="flex-1 px-8 py-5 rounded-[2rem] bg-slate-50 border border-slate-200 outline-none font-mono text-slate-900 transition-all shadow-inner"
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleVerifyApiKey}
                                        disabled={verifyLoading}
                                        className="px-8 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {verifyLoading ? 'Verificando...' : 'Verificar Clave'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-tight">La clave debe tener activadas las siguientes APIs: Maps JavaScript API, Places API, Directions API y Distance Matrix API.</p>
                            </div>

                            {/* Verification Result Display */}
                            {verifyStatus && (
                                <div className={`p-6 rounded-[2rem] border flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${
                                    verifyStatus.success 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                    : 'bg-red-50 border-red-100 text-red-800'
                                }`}>
                                    <div className="mt-0.5">
                                        {verifyStatus.success ? <ShieldCheck size={20} className="text-emerald-600"/> : <AlertCircle size={20} className="text-red-600"/>}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase tracking-tight">{verifyStatus.success ? 'Conexión Exitosa' : 'Error de Conexión'}</p>
                                        <p className="text-xs font-medium leading-relaxed">{verifyStatus.message}</p>
                                    </div>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="pt-6">
                                <button 
                                    onClick={handleSaveGoogleMaps} 
                                    disabled={saving} 
                                    className="bg-indigo-600 text-white w-full py-6 rounded-[2rem] font-black shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                                >
                                    <Save size={20}/>
                                    Guardar Ajustes de Mapas
                                </button>
                            </div>
                        </div>
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

                {activeTab === 'backup' && (
                    <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-premium animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-6 mb-12">
                            <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600">
                                <Database size={32}/>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Respaldo del Sistema</h3>
                                <p className="text-slate-500 font-medium tracking-tight">Exporta o importa la base de datos completa (incluye choferes, licencias, historiales, etc.).</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 space-y-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                                <div className="space-y-3">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                                        <Download size={22} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-950 uppercase tracking-tight">Exportar Datos</h4>
                                    <p className="text-sm text-slate-400 font-medium">Guarda una copia de seguridad en tu computadora con todos los datos actuales del sistema, incluyendo fotos e historiales de rutas.</p>
                                </div>
                                <button 
                                    onClick={async () => {
                                        try {
                                            const res = await window.api.db.exportDatabase();
                                            if (res.success) {
                                                alert("¡Base de datos exportada con éxito!");
                                            } else if (res.error) {
                                                alert(`Error al exportar: ${res.error}`);
                                            }
                                        } catch (error: any) {
                                            alert(`Error inesperado: ${error.message}`);
                                        }
                                    }} 
                                    className="bg-indigo-600 text-white w-full py-5 rounded-3xl font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    <Download size={18} />
                                    Exportar Base de Datos (.db)
                                </button>
                            </div>

                            <div className="p-8 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 space-y-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                                <div className="space-y-3">
                                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
                                        <Upload size={22} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-950 uppercase tracking-tight">Importar Datos</h4>
                                    <p className="text-sm text-slate-400 font-medium">Reemplaza todos los datos actuales cargando una base de datos guardada previamente. <span className="text-red-500 font-black">Esta acción es destructiva y sobrescribirá los datos locales actuales.</span></p>
                                </div>
                                <button 
                                    onClick={async () => {
                                        if (confirm("⚠️ ADVERTENCIA: Importar una base de datos reemplazará COMPLETAMENTE tus datos actuales (colonias, choferes, imágenes, rutas). ¿Deseas continuar?")) {
                                            try {
                                                const res = await window.api.db.importDatabase();
                                                if (res.success) {
                                                    alert("¡Base de datos importada correctamente! La aplicación se recargará para aplicar los cambios.");
                                                    window.location.reload();
                                                } else if (res.error) {
                                                    alert(`Error al importar: ${res.error}`);
                                                }
                                            } catch (error: any) {
                                                alert(`Error inesperado: ${error.message}`);
                                            }
                                        }
                                    }} 
                                    className="bg-red-600 text-white w-full py-5 rounded-3xl font-black shadow-xl shadow-red-100 flex items-center justify-center gap-2 hover:bg-red-700 transition-all active:scale-95"
                                >
                                    <Upload size={18} />
                                    Importar Base de Datos (.db)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {isTutorialOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-300 text-left">
                    <div className="bg-white rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-slate-100 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                                    Guía Práctica
                                </span>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mt-3">
                                    Cómo obtener tu API Key de Google Maps
                                </h3>
                            </div>
                            <button 
                                onClick={() => setIsTutorialOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content Scroll */}
                        <div className="flex-1 p-8 space-y-6 overflow-y-auto text-slate-700">
                            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] text-amber-800 flex items-start gap-4">
                                <AlertCircle className="shrink-0 mt-0.5 text-amber-600" size={20} />
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-tight">Importante: El servicio es gratuito</p>
                                    <p className="text-xs font-medium leading-relaxed">
                                        Google Maps regala <strong>$200 USD mensuales de crédito gratuito</strong>. Para las operaciones de esta app en una pequeña empresa, el consumo es virtualmente cero y no representará ningún cargo a tu tarjeta.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                                    <div>
                                        <h5 className="font-black text-slate-900 text-base uppercase tracking-tight">Crear cuenta en Google Cloud Console</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                                            Ingresa a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-black">Google Cloud Console ↗</a> con cualquier cuenta de Google (Gmail o corporativa) y crea un nuevo proyecto (ej. "BAMX Planner").
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                                    <div>
                                        <h5 className="font-black text-slate-900 text-base uppercase tracking-tight">Activar la cuenta de Facturación</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                                            Ve a la sección <strong>Facturación (Billing)</strong> y vincula una tarjeta de débito/crédito. Esto es obligatorio por seguridad de Google, pero recuerda que el consumo de la app se mantendrá dentro del saldo gratis de $200 USD/mes.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                                    <div>
                                        <h5 className="font-black text-slate-900 text-base uppercase tracking-tight">Habilitar las 4 APIs necesarias</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                                            Busca en la barra superior de Google Cloud Console cada uno de estos nombres y haz clic en <strong>"Habilitar" (Enable)</strong>:
                                        </p>
                                        <ul className="list-disc list-inside mt-2 text-xs font-black text-slate-700 uppercase space-y-1 ml-2">
                                            <li>Maps JavaScript API (Ver los mapas en la app)</li>
                                            <li>Places API (Buscar y autocompletar direcciones)</li>
                                            <li>Directions API (Dibujar trazado de calles)</li>
                                            <li>Distance Matrix API (Cálculo lógico de rutas óptimas)</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">4</div>
                                    <div>
                                        <h5 className="font-black text-slate-900 text-base uppercase tracking-tight">Obtener tu API Key</h5>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                                            Ve a <strong>APIs y Servicios ➜ Credenciales</strong>, haz clic en <strong>"+ Crear credenciales" ➜ "Clave de API"</strong>. Copia esa clave de API y pégala directamente en la pantalla de Ajustes.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setIsTutorialOpen(false)}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
                            >
                                Entendido, Cerrar Guía
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SettingsView
