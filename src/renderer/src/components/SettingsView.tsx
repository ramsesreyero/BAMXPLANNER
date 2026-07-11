import { useEffect, useState } from 'react'
import { MapPin, Clock, ShieldCheck, Calendar, Save, RefreshCcw, AlertCircle, Trash2, Database, Download, Upload, User, Map, Cpu } from 'lucide-react'
import { resetGoogleMapsLoader } from '../utils/googleMapsLoader'

interface Holiday {
  date: string;
  reason: string;
}

const SettingsView = () => {
    const [activeTab, setActiveTab] = useState<'warehouse' | 'operation' | 'holidays' | 'backup' | 'profile' | 'maps'>('profile')
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

    // Preferencias operativas. Los parametros tecnicos se conservan ocultos para el motor de rutas.
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
    const [useGoogleMaps, setUseGoogleMaps] = useState('true')
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState('')
    const [verifyStatus, setVerifyStatus] = useState<{ success?: boolean; message: string } | null>(null)
    const [verifyLoading, setVerifyLoading] = useState(false)
    const [showMapsAdvanced, setShowMapsAdvanced] = useState(false)
    const [savedUseGoogleMaps, setSavedUseGoogleMaps] = useState('false')
    const [savedGoogleMapsApiKey, setSavedGoogleMapsApiKey] = useState('')

    const [currentVersion, setCurrentVersion] = useState('1.0.0')
    const [updateStatus, setUpdateStatus] = useState<{
        checked: boolean
        loading: boolean
        newVersionAvailable: boolean
        latestTagName?: string
        latestUrl?: string
        errorMessage?: string
    }>({
        checked: false,
        loading: false,
        newVersionAvailable: false
    })

    const handleCheckForUpdates = async () => {
        setUpdateStatus({ checked: false, loading: true, newVersionAvailable: false })
        try {
            const res = await window.api.settings.checkUpdates()
            if (!res.success) {
                throw new Error(res.error || 'No se pudo conectar al repositorio en GitHub.')
            }
            const latestTag = res.tag_name || ''
            const downloadUrl = res.html_url || 'https://github.com/ramsesreyero/BAMXPLANNER/releases'
            
            const cleanCurrent = currentVersion.replace(/^v/, '')
            const cleanLatest = latestTag.replace(/^v/, '')
            
            if (cleanLatest && cleanLatest !== cleanCurrent) {
                setUpdateStatus({
                    checked: true,
                    loading: false,
                    newVersionAvailable: true,
                    latestTagName: latestTag,
                    latestUrl: downloadUrl
                })
            } else {
                setUpdateStatus({
                    checked: true,
                    loading: false,
                    newVersionAvailable: false,
                    latestTagName: latestTag
                })
            }
        } catch (error: any) {
            console.error("Error checking for updates:", error)
            setUpdateStatus({
                checked: true,
                loading: false,
                newVersionAvailable: false,
                errorMessage: error?.message || 'Error de conexión con GitHub.'
            })
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            // Cargar version de la app
            try {
                const ver = await window.api.window.getVersion()
                setCurrentVersion(ver)
            } catch (e) {
                console.error("Error loading app version:", e)
            }

            // Cargar almacen
            const wData = await window.api.db.list('warehouse')
            if (wData.length > 0) {
                const w = wData[0]
                setWarehouseData({
                    address: w.address || '',
                    coordinates: w.coordinates || '',
                    opening_time: w.opening_time || '08:00',
                    closing_time: w.closing_time || '18:00',
                    avg_unloading_time: w.avg_unloading_time || 30
                })
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
        const confirmed = window.confirm(
            "⚠️ CONFIGURACIÓN DE ALMACÉN SENSIBLE:\n\n" +
            "Modificar la ubicación (coordenadas) o tiempos del almacén central (CEDIS) cambiará el punto de origen y retorno de todas las rutas del mes.\n\n" +
            "¿Desea continuar con esta actualización?"
        );
        if (!confirmed) return;

        setSaving(true)
        try {
            const existing = await window.api.db.list('warehouse')
            if (existing.length > 0) {
                await window.api.db.update('warehouse', 1, warehouseData)
            } else {
                await window.api.db.create('warehouse', { ...warehouseData, id: 1 })
            }
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

    const handleSaveOperation = async () => {
        const confirmed = window.confirm(
            "⚠️ AJUSTE OPERATIVO DE ALGORITMO:\n\n" +
            "Cambiar el límite de paradas diarias afectará directamente la capacidad y densidad de entregas por unidad.\n\n" +
            "¿Desea guardar estos cambios?"
        );
        if (!confirmed) return;

        setSaving(true)
        try {
            await window.api.settings.set('algorithm_config', JSON.stringify(algoData))
            alert('¡Preferencias de operación guardadas exitosamente!')
        } catch (error: any) {
            console.error('Error saving operation preferences:', error)
            alert('Error al guardar las preferencias de operación: ' + error.message)
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
        if (useGoogleMaps === 'true') {
            const confirmed = window.confirm(
                "⚠️ CONFIGURACIÓN DE LLAVE SENSIBLE:\n\n" +
                "Activar Google Maps requiere una API Key válida con facturación activa en Google Cloud (APIs de Distance Matrix, Geocoding, Directions y Places).\n" +
                "Si la clave no es válida, la generación de rutas y mapas fallará.\n\n" +
                "¿Desea guardar y activar Google Maps?"
            );
            if (!confirmed) return;
        }

        setSaving(true)
        try {
            await window.api.settings.set('use_google_maps', useGoogleMaps)
            await window.api.settings.set('google_maps_api_key', googleMapsApiKey)
            setSavedUseGoogleMaps(useGoogleMaps)
            setSavedGoogleMapsApiKey(googleMapsApiKey)
            // Reset the SDK cache so the next map load uses the updated key
            resetGoogleMapsLoader()
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
        <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
                {/* Sidebar de Ajustes */}
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-slate-200 shadow-premium space-y-6">
                    <div className="px-2">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Ajustes</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Configuración general</p>
                    </div>

                    <nav className="flex flex-col gap-1">
                        {[
                            { id: 'profile', label: 'Perfil', icon: <User size={16}/> },
                            { id: 'warehouse', label: 'Almacén', icon: <MapPin size={16}/> },
                            { id: 'maps', label: 'Google Maps', icon: <Map size={16}/> },
                            { id: 'operation', label: 'Operación', icon: <Calendar size={16}/> },
                            { id: 'holidays', label: 'Días Inhábiles', icon: <Calendar size={16}/> },
                            { id: 'backup', label: 'Base de Datos', icon: <Database size={16}/> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all w-full text-left cursor-pointer ${
                                    activeTab === tab.id 
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 border border-indigo-500' 
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/80'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
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

                        <div className="border-t border-slate-100 pt-8 mt-8 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600">
                                    <Cpu size={24}/>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Información del Sistema</h3>
                                    <p className="text-slate-500 font-medium tracking-tight">Versión instalada y actualizaciones de software.</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-150">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Versión del Software</p>
                                    <p className="text-xl font-black text-slate-800 ml-1 mt-1">v{currentVersion}</p>
                                </div>
                                <button 
                                    onClick={handleCheckForUpdates} 
                                    disabled={updateStatus.loading}
                                    className="px-6 py-3.5 bg-white text-indigo-600 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {updateStatus.loading ? (
                                        <RefreshCcw size={14} className="animate-spin" />
                                    ) : (
                                        <RefreshCcw size={14} />
                                    )}
                                    Buscar Actualización
                                </button>
                            </div>

                            {updateStatus.checked && !updateStatus.loading && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    {updateStatus.newVersionAvailable ? (
                                        <div className="p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                            <div>
                                                <h4 className="font-black text-indigo-950 text-base uppercase tracking-tight">¡Nueva versión disponible! ({updateStatus.latestTagName})</h4>
                                                <p className="text-xs font-semibold text-indigo-700 mt-1">Descarga el nuevo instalador para actualizar las rutas y mapas.</p>
                                            </div>
                                            <a 
                                                href={updateStatus.latestUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-center"
                                            >
                                                <Download size={14} />
                                                Descargar
                                            </a>
                                        </div>
                                    ) : updateStatus.errorMessage ? (
                                        <div className="p-6 rounded-[2rem] bg-red-50 border border-red-100 flex items-center gap-3 text-red-900">
                                            <AlertCircle className="shrink-0" size={18} />
                                            <div>
                                                <p className="text-sm font-bold uppercase tracking-tight">Error al buscar actualizaciones</p>
                                                <p className="text-xs font-semibold opacity-85 mt-0.5">{updateStatus.errorMessage}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-900">
                                            <ShieldCheck className="shrink-0 text-emerald-600" size={18} />
                                            <div>
                                                <p className="text-sm font-bold uppercase tracking-tight">Sistema Actualizado</p>
                                                <p className="text-xs font-semibold opacity-85 mt-0.5">Estás utilizando la versión más reciente del planeador mensual.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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
                                    <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-250 p-4 text-amber-950 text-xs font-semibold mt-2">
                                        <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={14} />
                                        <span>⚠️ La modificación de las coordenadas reubica la base central (CEDIS). Asegúrese de que correspondan a su ubicación real para evitar fallos de cálculo.</span>
                                    </div>
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
                    <div className="max-w-3xl space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-premium animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-5">
                            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                                <Map size={30}/>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Mapas y direcciones</h3>
                                <p className="text-sm text-slate-500 font-medium">
                                    Google Maps queda integrado para buscar direcciones, validar ubicaciones y calcular distancias.
                                </p>
                            </div>
                        </div>

                        {savedUseGoogleMaps === 'true' && savedGoogleMapsApiKey ? (
                            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                                        <ShieldCheck size={20}/>
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black text-emerald-950">Google Maps activo</h5>
                                        <p className="text-xs font-medium text-emerald-700">
                                            La app usará Google cuando esté disponible y mantendrá respaldo con mapas libres si falla la conexión.
                                        </p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Listo</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-5">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white">
                                        <AlertCircle size={20}/>
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black text-amber-950">Google no está configurado</h5>
                                        <p className="text-xs font-medium text-amber-700">
                                            Se usará OpenStreetMap/OSRM como respaldo. Para activar Google, agrega la llave interna de la app.
                                        </p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">Respaldo</span>
                            </div>
                        )}

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-black text-slate-950">Modo avanzado</h4>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Solo úsalo si necesitas cambiar la llave o apagar Google temporalmente.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowMapsAdvanced(!showMapsAdvanced)}
                                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                                >
                                    {showMapsAdvanced ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>

                            {showMapsAdvanced && (
                                <div className="mt-5 space-y-5">
                                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
                                        <div>
                                            <h5 className="text-sm font-bold text-slate-950">Usar Google Maps</h5>
                                            <p className="text-xs text-slate-500">Si se apaga, la app usa mapas libres.</p>
                                        </div>
                                        <select
                                            value={useGoogleMaps}
                                            onChange={e => setUseGoogleMaps(e.target.value)}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                                        >
                                            <option value="true">Activado</option>
                                            <option value="false">Apagado</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500">Llave de Google Maps</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="password"
                                                value={googleMapsApiKey}
                                                onChange={e => setGoogleMapsApiKey(e.target.value)}
                                                placeholder="Llave integrada o personalizada"
                                                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleVerifyApiKey}
                                                disabled={verifyLoading}
                                                className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                                            >
                                                {verifyLoading ? 'Verificando...' : 'Verificar'}
                                            </button>
                                        </div>
                                        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-950 text-xs font-semibold mt-2">
                                            <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={14} />
                                            <span>⚠️ Llave de acceso sensible. Asegúrese de que correspondan a una API Key con permisos para Distance Matrix, Geocoding, Directions y Places.</span>
                                        </div>
                                    </div>

                                    {verifyStatus && (
                                        <div className={`flex items-start gap-3 rounded-xl border p-4 ${
                                            verifyStatus.success
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                            : 'border-red-200 bg-red-50 text-red-800'
                                        }`}>
                                            {verifyStatus.success ? <ShieldCheck size={20}/> : <AlertCircle size={20}/>}
                                            <div>
                                                <p className="text-sm font-black">{verifyStatus.success ? 'Conexión correcta' : 'No se pudo conectar'}</p>
                                                <p className="text-sm">{verifyStatus.message}</p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSaveGoogleMaps}
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"
                                    >
                                        <Save size={18}/>
                                        Guardar mapas
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'operation' && (
                    <div className="max-w-4xl bg-white p-10 rounded-[3rem] border border-slate-200 shadow-premium animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-6 mb-10">
                            <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600">
                                <Calendar size={30}/>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Preferencias de operación</h3>
                                <p className="text-slate-500 font-medium tracking-tight">Define limites sencillos para que la planeación sea practica para el equipo.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
                            <div className="space-y-6">
                                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicios maximos por unidad al dia</label>
                                    <div className="mt-4 flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="3"
                                            max="18"
                                            value={algoData.maxRoutesPerDay}
                                            onChange={e => setAlgoData({ ...algoData, maxRoutesPerDay: parseInt(e.target.value, 10) || 10 })}
                                            className="h-2 flex-1 accent-indigo-600"
                                        />
                                        <input
                                            type="number"
                                            min="3"
                                            max="18"
                                            value={algoData.maxRoutesPerDay}
                                            onChange={e => setAlgoData({ ...algoData, maxRoutesPerDay: parseInt(e.target.value, 10) || 10 })}
                                            className="w-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xl font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                                        Usa un numero menor si las entregas suelen tomar mas tiempo o si prefieres rutas mas ligeras para los conductores.
                                    </p>
                                </div>

                                <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6">
                                    <div className="flex items-start gap-4">
                                        <ShieldCheck className="mt-1 shrink-0 text-emerald-700" size={22}/>
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-tight text-emerald-950">Calculo automatico protegido</h4>
                                            <p className="mt-1 text-sm font-medium leading-relaxed text-emerald-800">
                                                La app mantiene reglas recomendadas por defecto. El usuario solo necesita ajustar el volumen operativo.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <aside className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Sugerencia</p>
                                <p className="mt-3 text-4xl font-black tracking-tighter text-indigo-950">{algoData.maxRoutesPerDay}</p>
                                <p className="mt-2 text-sm font-bold leading-relaxed text-indigo-800">
                                    servicios por unidad es un punto de partida razonable para revisar carga, tiempos y distancias antes de enviar la ruta.
                                </p>
                            </aside>
                        </div>

                        <div className="flex justify-end mt-10">
                             <button onClick={handleSaveOperation} disabled={saving} className="bg-slate-950 text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl flex items-center gap-3 transition-opacity disabled:opacity-50">
                                <Save size={20}/>
                                Guardar operación
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
                                                await window.api.settings.set('last_backup_at', new Date().toISOString());
                                                window.dispatchEvent(new Event('settings-updated'));
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
            </div>
        </div>
    )
}

export default SettingsView
