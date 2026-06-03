import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    ChevronRight, Plus, Truck, Users, MapPin, 
    Clock, CheckCircle2, Trash2, ArrowRight, Search, Filter, 
    Building2, Edit3, X, ShoppingCart, 
    Package
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MonthlyScheduler, MonthlyPlan } from '../utils/monthlyScheduler'
import ConfirmModal from './ConfirmModal'
import { PlanningHeader } from './planning/PlanningHeader'
import { PlanningStats } from './planning/PlanningStats'
import { MonthlyPlanModal } from './planning/MonthlyPlanModal'
import { CalendarGrid } from './planning/CalendarGrid'
import { exportRouteToPDF } from '../utils/jsPDFRouteExport'
import { FileText } from 'lucide-react'

const PlanningView = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [routes, setRoutes] = useState<any[]>([])
    const [trucks, setTrucks] = useState<any[]>([])
    const [drivers, setDrivers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm] = useState('')
    const [viewMode, setViewMode] = useState<'calendar' | 'day'>('calendar')
    const [monthSummary, setMonthSummary] = useState<any[]>([])



    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false)
    const [routeFormData, setRouteFormData] = useState({
        date: '',
        truck_id: '',
        driver_id: '',
        type: 'Entrega'
    })

    // Estado del modal para agregar una parada a una ruta
    const [isStopModalOpen, setIsStopModalOpen] = useState(false)
    const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null)
    const [stopFormData, setStopFormData] = useState({
        route_id: ''
    })
    const [confirmAction, setConfirmAction] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: async (): Promise<void> => { }
    })

    const [isManualAddOpen, setIsManualAddOpen] = useState(false)
    const [manualAddData, setManualAddData] = useState({
        type: 'Colonia',
        id: ''
    })
    const [manualOptions, setManualOptions] = useState<any[]>([])

    // Mensual
    const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false)
    const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan | null>(null)
    const [isGeneratingMonthly, setIsGeneratingMonthly] = useState(false)
    const [selectedFilters, setSelectedFilters] = useState({
        supermarkets: true,
        colonies: true,
        beneficiaries: true,
        institutions: true
    })
    const [showFilters, setShowFilters] = useState(false)
    
    // Seleccion de mes/ano para la planeacion
    const location = useLocation()
    const navigate = useNavigate()
    
    // Obtener mes/ano de la URL si viene del historial
    const queryParams = new URLSearchParams(location.search)
    const initialMonth = queryParams.get('month') ? parseInt(queryParams.get('month')!) : new Date().getMonth()
    const initialYear = queryParams.get('year') ? parseInt(queryParams.get('year')!) : new Date().getFullYear()

    const [planMonth, setPlanMonth] = useState(initialMonth)
    const [planYear, setPlanYear] = useState(initialYear)

    // Actualizar URL cuando cambia el mes/ano
    useEffect(() => {
        const newSearchParams = new URLSearchParams();
        newSearchParams.set('month', planMonth.toString());
        newSearchParams.set('year', planYear.toString());
        navigate(`?${newSearchParams.toString()}`, { replace: true });
    }, [planMonth, planYear, navigate]);

    // Calculo de estadisticas
    const calculatePlanStats = (plan: MonthlyPlan) => {
        let totalDistance = 0;
        let totalStops = 0;
        let activeDays = 0;
        
        plan.days.forEach(day => {
            const stopsA = day.truckA.stops.length;
            const stopsB = day.truckB.stops.length;
            if (stopsA > 0 || stopsB > 0) activeDays++;
            
            totalStops += stopsA + stopsB;
            totalDistance += (day.truckA.stats?.distanceKm || 0) + (day.truckB.stats?.distanceKm || 0);
        });

        return {
            totalDistance: totalDistance.toFixed(1),
            totalStops,
            activeDays,
            avgStopsPerDay: (totalStops / activeDays || 0).toFixed(1)
        };
    };

    const loadData = async () => {
        setLoading(true)
        try {
            const [sug, rts, trk, drv] = await Promise.all([
                window.api.planning.getSuggestions(selectedDate),
                window.api.planning.getRoutes(selectedDate),
                window.api.db.list('trucks'),
                window.api.db.list('drivers')
            ])
            setSuggestions(sug)
            setRoutes(rts)
            setTrucks(trk)
            setDrivers(drv)
        } catch (error) {
            console.error('Error loading planning data:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadMonthSummary = async () => {
        try {
            const summary = await window.api.planning.getMonthSummary(planYear, planMonth)
            setMonthSummary(summary)
        } catch (error) {
            console.error('Error loading month summary:', error)
        }
    }

    useEffect(() => {
        if (viewMode === 'day') {
            loadData()
        } else {
            loadMonthSummary()
            const loadLogistics = async () => {
                try {
                    const [trk, drv] = await Promise.all([
                        window.api.db.list('trucks'),
                        window.api.db.list('drivers')
                    ])
                    setTrucks(trk)
                    setDrivers(drv)
                } catch (e) {
                    console.error('Error loading logistics data in calendar mode:', e)
                }
            }
            loadLogistics()
        }
    }, [selectedDate, viewMode, planMonth, planYear])

    const loadMonthPlan = async () => {
        setLoading(true);
        try {
            const plan = await window.api.planning.getMonthPlan(planYear, planMonth);
            // Si el plan no tiene paradas en absoluto, lo dejamos como null para forzar el "Empty State"
            const hasStops = plan.days.some(d => d.truckA.stops.length > 0 || d.truckB.stops.length > 0);
            setMonthlyPlan(hasStops ? plan : null);
        } catch (error) {
            console.error("Error loading month plan:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isMonthlyModalOpen) {
            loadMonthPlan();
        }
    }, [isMonthlyModalOpen, planMonth, planYear]);

    const handleCreateRoute = () => {
        if (trucks.length === 0 || drivers.length === 0) {
            alert('Debes registrar al menos una unidad y un chofer primero.')
            return
        }
        setRouteFormData({
            date: selectedDate,
            truck_id: trucks[0].id.toString(),
            driver_id: drivers[0].id.toString(),
            type: 'Entrega'
        })
        setIsRouteModalOpen(true)
    }

    const submitRouteForm = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await window.api.planning.createRoute({
                date: routeFormData.date || selectedDate,
                truck_id: parseInt(routeFormData.truck_id),
                driver_id: parseInt(routeFormData.driver_id),
                type: routeFormData.type
            })
            setIsRouteModalOpen(false)
            if (routeFormData.date) {
                setSelectedDate(routeFormData.date)
            }
            setViewMode('day')
            loadData()
        } catch (error) {
            console.error('Error creating route:', error)
        }
    }

    const handleFinishPlanning = async (routeId: number) => {
        try {
            await window.api.db.update('routes', routeId, { status: 'Completada' })
            loadData()
        } catch (error) {
            console.error('Error finishing planning:', error)
        }
    }

    const handleVincularSugerencias = async (routeId: number) => {
        const activeSuggestions = suggestions.filter(s => {
            if (s.type === 'Supermercado' && !selectedFilters.supermarkets) return false;
            if (s.type === 'Colonia' && !selectedFilters.colonies) return false;
            if (s.type === 'Institución' && !selectedFilters.institutions) return false;
            return true;
        });

        if (activeSuggestions.length === 0) return
        try {
            const targetRoute = routes.find(r => r.id === routeId)
            let currentSequence = targetRoute && targetRoute.stops ? targetRoute.stops.length : 0

            for (const suggestion of activeSuggestions) {
                currentSequence++
                await window.api.planning.addStop({
                    route_id: routeId,
                    stop_type: suggestion.type === 'Supermercado' ? 'Supermercado' :
                               suggestion.type === 'Institución' ? 'Institución' : 'Colonia',
                    stop_id: suggestion.id,
                    sequence_order: currentSequence
                })
            }
            loadData()
        } catch (error) {
            console.error('Error linking suggestions:', error)
        }
    }

    const submitStopForm = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedSuggestion || !stopFormData.route_id) return
        try {
            // Buscando la ruta a la cual asignaremos la sugerencia para encontrar el max order.
            const targetRoute = routes.find(r => r.id.toString() === stopFormData.route_id)
            const nextSequence = targetRoute && targetRoute.stops ? targetRoute.stops.length + 1 : 1

            await window.api.planning.addStop({
                route_id: parseInt(stopFormData.route_id),
                stop_type: selectedSuggestion.type === 'Colonia' ? 'Colonia' :
                    selectedSuggestion.type === 'Institución' ? 'Institución' :
                        selectedSuggestion.type === 'Supermercado' ? 'Supermercado' : 'Colonia',
                stop_id: selectedSuggestion.id,
                sequence_order: nextSequence
            })
            setIsStopModalOpen(false)
            setSelectedSuggestion(null)
            loadData()
        } catch (error) {
            console.error('Error adding stop:', error)
        }
    }

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!manualAddData.id || !stopFormData.route_id) return
        try {
            const targetRoute = routes.find(r => r.id.toString() === stopFormData.route_id)
            const nextSequence = targetRoute && targetRoute.stops ? targetRoute.stops.length + 1 : 1

            await window.api.planning.addStop({
                route_id: parseInt(stopFormData.route_id),
                stop_type: manualAddData.type,
                stop_id: parseInt(manualAddData.id),
                sequence_order: nextSequence
            })
            setIsManualAddOpen(false)
            loadData()
        } catch (error) {
            console.error('Error adding manual stop:', error)
        }
    }

    const loadManualOptions = async (type: string) => {
        const table = type === 'Colonia' ? 'colonies' :
            type === 'Institución' ? 'institutions' : 'supermarkets'
        const options = await window.api.db.list(table)
        setManualOptions(options)
        setManualAddData({ type, id: options[0]?.id?.toString() || '' })
    }

    const filteredSuggestions = suggestions.filter((s) => {
        if (s.type === 'Supermercado' && !selectedFilters.supermarkets) return false;
        if (s.type === 'Colonia' && !selectedFilters.colonies) return false;
        if (s.type === 'Institución' && !selectedFilters.institutions) return false;
        return true;
    });

    const dayName = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).format(new Date(selectedDate + 'T12:00:00'))



    const handleGenerateMonthlyPlan = async () => {
        setIsGeneratingMonthly(true);
        setIsMonthlyModalOpen(true);
        try {
            const [colonies, supermarkets, institutions, caridad, trucks, drivers, algoConfig, holidays, cedisCoordsSetting] = await Promise.all([
                window.api.db.list('colonies'),
                window.api.db.list('supermarkets'),
                window.api.db.list('institutions'),
                window.api.db.list('beneficiaries'),
                window.api.db.list('trucks'),
                window.api.db.list('drivers'),
                window.api.settings.get('algorithm_config'),
                window.api.settings.get('non_working_days'),
                window.api.settings.get('cedis_coords')
            ]);

            const gaConfig = algoConfig ? JSON.parse(algoConfig.value) : undefined;
            const nonWorkingDays = holidays ? JSON.parse(holidays.value).map((h: any) => h.date) : [];
            // maxRoutesPerDay viene de la configuración de Ajustes > Algoritmo
            const maxStopsPerTruck: number = gaConfig?.maxRoutesPerDay ?? 10;

            // Leer coordenadas del CEDIS desde ajustes (C. Iturbide 1407, San José, 88230 Nuevo Laredo)
            let cedisLat = 27.477850806886945;
            let cedisLng = -99.49498391012905;
            if (cedisCoordsSetting?.value) {
                const parts = cedisCoordsSetting.value.split(',').map((p: string) => parseFloat(p.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    cedisLat = parts[0];
                    cedisLng = parts[1];
                }
            }

            const scheduler = new MonthlyScheduler({
                startDate: `${planYear}-${planMonth + 1}-01`,
                colonies: selectedFilters.colonies ? colonies : [],
                supermarkets: selectedFilters.supermarkets ? supermarkets : [],
                institutions: selectedFilters.institutions ? institutions : [],
                caridad: selectedFilters.beneficiaries ? caridad : [],
                trucks,
                drivers,
                gaConfig,
                nonWorkingDays,
                cedisLat,
                cedisLng,
                maxStopsPerTruck
            });

            const plan = await scheduler.generate();
            setMonthlyPlan(plan);
        } catch (error) {
            console.error("Error generating monthly plan:", error);
        } finally {
            setIsGeneratingMonthly(false);
        }
    };


    const handleConfirmMonthlyPlan = async () => {
        if (!monthlyPlan || !monthlyPlan.days.length) return;
        
        // Usar el rango real del mes para reemplazo limpio
        const startDate = `${planYear}-${String(planMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(planYear, planMonth + 1, 0).getDate();
        const endDate = `${planYear}-${String(planMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        if (!confirm(`Se guardará la planeación de ${monthlyPlan.monthName} (${planYear}). Si ya existen rutas en este periodo, serán reemplazadas. ¿Deseas continuar?`)) {
            return;
        }

        try {
            await window.api.planning.saveMonthlyPlan({
                plan: monthlyPlan.days,
                startDate,
                endDate
            });
            setIsMonthlyModalOpen(false);
            setMonthlyPlan(null);
            setSelectedDate(startDate);
            setViewMode('calendar');
            await loadMonthSummary();
            alert(`¡Plan mensual para ${monthlyPlan.monthName} guardado con éxito!`);
        } catch (error) {
            console.error("Error saving monthly plan:", error);
            alert("Error al guardar el plan mensual.");
        }
    };



    const removeStopFromDay = (dayIdx: number, truck: 'truckA' | 'truckB', stopIdx: number) => {
        if (!monthlyPlan) return;
        const newPlan = { ...monthlyPlan };
        newPlan.days[dayIdx][truck].stops.splice(stopIdx, 1);
        setMonthlyPlan({ ...newPlan });
    };

    const moveStopBetweenTrucks = (dayIdx: number, fromTruck: 'truckA' | 'truckB', stopIdx: number) => {
        if (!monthlyPlan) return;
        const newPlan = { ...monthlyPlan };
        const toTruck = fromTruck === 'truckA' ? 'truckB' : 'truckA';
        const [stop] = newPlan.days[dayIdx][fromTruck].stops.splice(stopIdx, 1);
        newPlan.days[dayIdx][toTruck].stops.push(stop);
        setMonthlyPlan({ ...newPlan });
    };

    const reorderStopInDay = (dayIdx: number, truck: 'truckA' | 'truckB', stopIdx: number, direction: 'up' | 'down') => {
        if (!monthlyPlan) return;
        const newPlan = { ...monthlyPlan };
        const stops = newPlan.days[dayIdx][truck].stops;
        const newIdx = direction === 'up' ? stopIdx - 1 : stopIdx + 1;
        if (newIdx >= 0 && newIdx < stops.length) {
            [stops[stopIdx], stops[newIdx]] = [stops[newIdx], stops[stopIdx]];
            setMonthlyPlan({ ...newPlan });
        }
    };

    const dailyStats = {
        totalStops: routes.reduce((acc, r) => acc + (r.stops?.length || 0), 0),
        totalVolume: routes.reduce((acc, r) => acc + (r.stops?.reduce((sum, s) => sum + (s.volume || 0), 0) || 0), 0),
        activeUnits: routes.length,
        totalRecovery: routes.reduce((acc, r) => acc + (r.stops?.reduce((sum, s) => sum + (s.recovery_fee || 0), 0) || 0), 0),
    }

    const monthlyStats = {
        totalStops: monthSummary.reduce((acc, s) => acc + (s.routes_count || 0), 0),
        totalVolume: monthSummary.reduce((acc, s) => acc + (s.total_volume || 0), 0),
        activeUnits: monthSummary.filter(s => s.routes_count > 0).length,
        totalRecovery: monthSummary.reduce((acc, s) => acc + (s.total_recovery || 0), 0),
    }

    const currentStats = viewMode === 'day' ? dailyStats : monthlyStats

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Seccion de encabezado premium redisenado */}
            <div className="space-y-6">
                <PlanningHeader
                    viewMode={viewMode}
                    dayName={dayName}
                    planMonth={planMonth}
                    planYear={planYear}
                    selectedDate={selectedDate}
                    setViewMode={setViewMode}
                    setSelectedDate={setSelectedDate}
                    setPlanMonth={setPlanMonth}
                    setPlanYear={setPlanYear}
                    setIsMonthlyModalOpen={setIsMonthlyModalOpen}
                    handleCreateRoute={handleCreateRoute}
                />
                <PlanningStats viewMode={viewMode} currentStats={currentStats} />
            </div>



            {/* Modal de plan mensual via portal */}
            <MonthlyPlanModal
                isOpen={isMonthlyModalOpen}
                onClose={() => setIsMonthlyModalOpen(false)}
                planMonth={planMonth}
                planYear={planYear}
                setPlanMonth={setPlanMonth}
                setPlanYear={setPlanYear}
                isGeneratingMonthly={isGeneratingMonthly}
                handleGenerateMonthlyPlan={handleGenerateMonthlyPlan}
                handleConfirmMonthlyPlan={handleConfirmMonthlyPlan}
                monthlyPlan={monthlyPlan}
                calculatePlanStats={calculatePlanStats}
                reorderStopInDay={reorderStopInDay}
                moveStopBetweenTrucks={moveStopBetweenTrucks}
                removeStopFromDay={removeStopFromDay}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
            />

            {/* Area de contenido principal: calendario o detalle del dia */}
            {viewMode === 'calendar' ? (
                <CalendarGrid
                    planYear={planYear}
                    planMonth={planMonth}
                    monthSummary={monthSummary}
                    setSelectedDate={setSelectedDate}
                    setViewMode={setViewMode}
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Barra lateral de sugerencias */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 shadow-premium p-8 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl heading-premium text-slate-900 uppercase">
                                Recomendaciones
                            </h3>
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 rounded-xl transition-all ${
                                    showFilters 
                                    ? 'bg-orange-50 text-orange-600' 
                                    : 'text-slate-300 hover:text-slate-400 hover:bg-slate-50'
                                }`}
                            >
                                <Filter size={18} />
                            </button>
                        </div>

                        {showFilters && (
                            <div className="mb-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-200/60 space-y-3 animate-in slide-in-from-top duration-300">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    Filtrar por tipo:
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setSelectedFilters(prev => ({ ...prev, supermarkets: !prev.supermarkets }))}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                                            selectedFilters.supermarkets
                                            ? 'bg-orange-50 border-orange-200 text-orange-600'
                                            : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                                        }`}
                                    >
                                        <ShoppingCart size={12} />
                                        Súper
                                    </button>
                                    <button
                                        onClick={() => setSelectedFilters(prev => ({ ...prev, colonies: !prev.colonies }))}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                                            selectedFilters.colonies
                                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                                            : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                                        }`}
                                    >
                                        <MapPin size={12} />
                                        Colonias
                                    </button>
                                    <button
                                        onClick={() => setSelectedFilters(prev => ({ ...prev, institutions: !prev.institutions }))}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                                            selectedFilters.institutions
                                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                                            : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Building2 size={12} />
                                        Inst.
                                    </button>
                                    <button
                                        onClick={() => setSelectedFilters(prev => ({ ...prev, beneficiaries: !prev.beneficiaries }))}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                                            selectedFilters.beneficiaries
                                            ? 'bg-purple-50 border-purple-200 text-purple-600'
                                            : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Users size={12} />
                                        Caridad
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {filteredSuggestions.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <MapPin size={32} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase">
                                        Sin resultados
                                    </p>
                                </div>
                            ) : (
                                filteredSuggestions
                                    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((stop) => (
                                        <div
                                            key={stop.id}
                                            className={`group p-4 rounded-2xl border transition-all duration-300 ${routes.length > 0 && routes.every(r => r.status === 'Completada')
                                                    ? 'opacity-50 grayscale cursor-not-allowed bg-slate-100 border-slate-200'
                                                    : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:border-orange-200 hover:shadow-lg'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start space-x-3">
                                                    <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500">
                                                        {stop.type === 'Institución' ? <Building2 size={20} /> :
                                                            stop.type === 'Supermercado' ? <ShoppingCart size={20} /> :
                                                                <MapPin size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 line-clamp-1">
                                                            {stop.name}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">
                                                            {stop.type || 'Sugerencia'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    disabled={routes.length > 0 && routes.every(r => r.status === 'Completada')}
                                                    onClick={() => {
                                                        const activeRoutes = routes.filter(r => r.status !== 'Completada')
                                                        setSelectedSuggestion(stop)
                                                        setStopFormData({ route_id: activeRoutes.length > 0 ? activeRoutes[0].id.toString() : '' })
                                                        setIsStopModalOpen(true)
                                                    }}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all opacity-0 group-hover:opacity-100 ${routes.length > 0 && routes.every(r => r.status === 'Completada')
                                                            ? 'text-slate-300 cursor-not-allowed'
                                                            : 'text-slate-300 hover:text-orange-600 hover:bg-orange-50'
                                                        }`}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>

                        <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col gap-3">
                            <button
                                onClick={async () => {
                                    const colonies = await window.api.db.list('colonies')
                                    setManualOptions(colonies)
                                    setManualAddData({ type: 'Colonia', id: colonies[0]?.id?.toString() || '' })
                                    setIsManualAddOpen(true)
                                }}
                                className="w-full py-4 px-6 bg-slate-50 rounded-2xl text-[11px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                            >
                                <Search size={14} /> Buscar Manualmente
                            </button>
                        </div>
                    </div>
                </div>

                {/* Area principal de planeacion */}
                <div className="lg:col-span-3 space-y-8">
                    {loading ? (
                        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-20 text-center shadow-premium">
                            <div className="w-16 h-16 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin mx-auto mb-6" />
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">
                                Optimizando Logística...
                            </p>
                        </div>
                    ) : routes.length === 0 ? (
                        <div className="bg-slate-50/50 border-4 border-dashed border-slate-100 rounded-[3rem] p-24 text-center">
                            <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-premium flex items-center justify-center mx-auto mb-8 animate-bounce">
                                <Truck size={40} className="text-slate-200" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                                Comienza la Jornada
                            </h2>
                            <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10 text-lg">
                                Aún no hay rutas definidas para esta fecha. Inicia creando una nueva unidad de
                                entrega.
                            </p>
                            <button
                                onClick={handleCreateRoute}
                                className="bg-orange-600 text-white px-10 py-5 rounded-2xl font-black shadow-2xl shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95 text-lg"
                            >
                                Crear Primer Despliegue
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-12">
                            {routes.map((route) => {
                                const truck = trucks.find(t => t.id === route.truck_id);
                                const routeVolume = route.stops?.reduce((sum, s) => sum + (s.volume || 0), 0) || 0;
                                const capacityPercent = truck ? Math.min(Math.round((routeVolume / truck.capacity_kg) * 100), 100) : 0;

                                return (
                                    <div
                                        key={route.id}
                                        className="bg-white/70 backdrop-blur-xl rounded-[3.5rem] border border-white/60 shadow-premium overflow-hidden group hover:bg-white transition-all duration-500"
                                    >
                                        <div className="p-10 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-8 bg-gradient-to-r from-slate-50/50 to-transparent">
                                            <div className="flex flex-wrap items-center gap-10">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-900/10 group-hover:scale-110 transition-transform">
                                                        <Truck size={28} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 opacity-60">
                                                            Flota Operativa
                                                        </p>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                                                                {route.truck_name || 'Sin unidad'}
                                                            </p>
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                                route.status === 'Completada' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                                                            }`}>
                                                                {route.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="hidden sm:block w-px h-12 bg-slate-200/60" />

                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 rounded-[2rem] bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                        <Users size={28} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 opacity-60">
                                                            Capitán de Ruta
                                                        </p>
                                                        <p className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                                                            {route.driver_name || 'Sin chofer'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="hidden sm:block w-px h-12 bg-slate-200/60" />

                                                <div className="flex-1 min-w-[200px]">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Carga Utilizada</p>
                                                        <p className="text-[10px] font-black text-slate-900">{capacityPercent}%</p>
                                                    </div>
                                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                                                capacityPercent > 90 ? 'bg-red-500' : 
                                                                capacityPercent > 70 ? 'bg-orange-500' : 'bg-emerald-500'
                                                            }`}
                                                            style={{ width: `${capacityPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => exportRouteToPDF(route)}
                                                    className="w-14 h-14 flex items-center justify-center text-slate-300 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all"
                                                    title="Exportar a PDF"
                                                >
                                                    <FileText size={24} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmAction({
                                                        isOpen: true,
                                                        title: 'Eliminar Ruta',
                                                        message: '¿Estás seguro de eliminar esta ruta permanentemente?',
                                                        action: async () => {
                                                            if (route.stops && route.stops.length > 0) {
                                                                for (const stop of route.stops) {
                                                                    await window.api.db.delete('route_stops', stop.id)
                                                                }
                                                            }
                                                            await window.api.db.delete('routes', route.id)
                                                            loadData()
                                                        }
                                                    })}
                                                    className="w-14 h-14 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                                >
                                                    <Trash2 size={24} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-12">
                                            <div className="max-w-4xl mx-auto">
                                                {route.stops && route.stops.length > 0 ? (
                                                    <div className="relative space-y-10">
                                                        {/* Linea estatica */}
                                                        <div className="absolute left-7 top-6 bottom-6 w-0.5 bg-gradient-to-b from-slate-900 via-slate-200 to-slate-100" />

                                                        {/* Punto de partida */}
                                                        <div className="flex items-center space-x-10 relative">
                                                            <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-black z-10 border-[6px] border-white shadow-2xl">
                                                                <Building2 size={20} />
                                                            </div>
                                                            <div className="flex-1 p-6 rounded-3xl bg-slate-900 text-white shadow-2xl">
                                                                <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-1">
                                                                    Punto de Despegue
                                                                </p>
                                                                <p className="text-lg font-black tracking-tight">
                                                                    CEDIS BAMX NUEVO LAREDO
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {route.stops.map((stop: any, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center space-x-10 relative group/stop"
                                                            >
                                                                <div className="w-14 h-14 rounded-full bg-white text-slate-900 flex items-center justify-center font-black z-10 border-[6px] border-slate-50 shadow-lg group-hover/stop:border-orange-500 group-hover/stop:scale-110 transition-all duration-500">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1 flex items-center justify-between p-8 rounded-[2.5rem] bg-white border border-slate-200/60 shadow-sm group-hover/stop:shadow-premium group-hover/stop:border-orange-200 transition-all duration-500">
                                                                    <div className="flex items-center gap-6">
                                                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover/stop:bg-orange-50 group-hover/stop:text-orange-600 transition-colors">
                                                                            {stop.stop_type === 'Institución' ? <Building2 size={24} /> :
                                                                             stop.stop_type === 'Supermercado' ? <ShoppingCart size={24} /> :
                                                                             <MapPin size={24} />}
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-3 mb-1.5">
                                                                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{stop.stop_type}</span>
                                                                                {stop.recovery_fee > 0 && (
                                                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full border border-emerald-100 uppercase">
                                                                                        ${stop.recovery_fee} Cobro
                                                                                    </span>
                                                                                )}
                                                                                {stop.is_foreign === 1 && (
                                                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full border border-indigo-100 uppercase">
                                                                                        Foráneo
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                                                                                {stop.stop_name || stop.stop_id}
                                                                            </p>
                                                                            <div className="flex items-center gap-4 mt-2">
                                                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                                                                    <Package size={12} />
                                                                                    {stop.volume} Unidades
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setConfirmAction({
                                                                            isOpen: true,
                                                                            title: 'Quitar Parada',
                                                                            message: '¿Estás seguro de quitar esta parada de la ruta actual?',
                                                                            action: async () => {
                                                                                await window.api.db.delete('route_stops', stop.id)
                                                                                loadData()
                                                                            }
                                                                        })}
                                                                        className="w-12 h-12 flex items-center justify-center text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover/stop:opacity-100"
                                                                    >
                                                                        <Trash2 size={20} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {route.stops && route.stops.length > 0 && (
                                                            <div className="flex items-center space-x-10 relative">
                                                                <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-black z-10 border-[6px] border-white shadow-2xl">
                                                                    <Building2 size={20} />
                                                                </div>
                                                                <div className="flex-1 p-6 rounded-3xl bg-slate-900 text-white shadow-2xl">
                                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">
                                                                        Retorno al Almacén
                                                                    </p>
                                                                    <p className="text-lg font-black tracking-tight">
                                                                        CEDIS BAMX NUEVO LAREDO
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center space-x-10 relative">
                                                            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-black z-10 border-[6px] border-white shadow-sm italic">
                                                                <Plus size={20} />
                                                            </div>
                                                            <button
                                                                disabled={route.status === 'Completada'}
                                                                onClick={async () => {
                                                                    const colonies = await window.api.db.list('colonies')
                                                                    setManualOptions(colonies)
                                                                    setManualAddData({ type: 'Colonia', id: colonies[0]?.id?.toString() || '' })
                                                                    setStopFormData({ route_id: route.id.toString() })
                                                                    setIsManualAddOpen(true)
                                                                }}
                                                                className={`flex-1 p-8 rounded-[2.5rem] border-2 border-dashed font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-4 group/add ${route.status === 'Completada'
                                                                    ? 'border-slate-100 text-slate-200 cursor-not-allowed opacity-50'
                                                                    : 'border-slate-200 text-slate-400 hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50/50'
                                                                    }`}
                                                            >
                                                                <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center group-hover/add:rotate-90 transition-transform">
                                                                    <Plus size={18} className="text-orange-600" />
                                                                </div>
                                                                Anexar Nuevo Punto Operativo
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="py-24 text-center bg-slate-50/50 rounded-[3.5rem] border-2 border-dashed border-slate-200">
                                                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-premium">
                                                            <ArrowRight size={32} className="text-slate-200" />
                                                        </div>
                                                        <h4 className="text-xl font-black text-slate-900 mb-2">Configuración Vacía</h4>
                                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">
                                                            Aún no hay paradas asignadas a esta unidad
                                                        </p>
                                                        <button
                                                            disabled={route.status === 'Completada'}
                                                            onClick={() => handleVincularSugerencias(route.id)}
                                                            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${route.status === 'Completada'
                                                                ? 'text-slate-300 cursor-not-allowed bg-slate-100'
                                                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10'
                                                                }`}
                                                        >
                                                            Vincular Inteligencia
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-10 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-8">
                                            <div className="flex items-center gap-12">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                                        <Clock size={20} className="text-orange-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Tiempo Estimado</p>
                                                        <p className="text-white font-black tracking-tighter uppercase text-lg leading-none">
                                                            0 hrs 0 min
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                                        <MapPin size={20} className="text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Alcance</p>
                                                        <p className="text-white font-black tracking-tighter uppercase text-lg leading-none">
                                                            {route.stops?.length || 0} Paradas
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {route.status === 'Completada' ? (
                                                <button
                                                    onClick={async () => {
                                                        await window.api.db.update('routes', route.id, { status: 'Pendiente' })
                                                        loadData()
                                                    }}
                                                    className="w-full sm:w-auto px-12 py-5 bg-white/5 border border-white/10 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-white/10 transition-all active:scale-[0.98] flex items-center justify-center gap-4 group/edit uppercase text-xs tracking-widest"
                                                >
                                                    <span>Reabrir Edición</span>
                                                    <Edit3 size={18} className="group-hover/edit:rotate-12 transition-transform" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleFinishPlanning(route.id)}
                                                    className="w-full sm:w-auto px-12 py-5 bg-orange-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-orange-900/20 hover:bg-orange-500 transition-all active:scale-[0.98] flex items-center justify-center gap-4 group/final uppercase text-xs tracking-widest"
                                                >
                                                    <span>Concluir Operación</span>
                                                    <CheckCircle2 size={18} className="group-hover/final:scale-125 transition-transform" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Modal de creacion de ruta */}
            {isRouteModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
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
                                onClick={() => setIsRouteModalOpen(false)}
                                className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-2xl"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={submitRouteForm} className="p-10 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                                    Fecha de la Ruta
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={routeFormData.date}
                                    onChange={(e) => setRouteFormData({ ...routeFormData, date: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900 cursor-pointer"
                                />
                            </div>
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
                                    onClick={() => setIsRouteModalOpen(false)}
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
                </div>,
                document.body
            )}

            {/* Modal para agregar parada */}
            {isStopModalOpen && selectedSuggestion && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-10 border-b border-slate-100/50 relative bg-gradient-to-br from-white to-orange-50/30">
                            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-orange-200">
                                <MapPin size={28} className="text-orange-600" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                                Vincular <span className="text-orange-600">Lugar</span>
                            </h3>
                            <button
                                onClick={() => setIsStopModalOpen(false)}
                                className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-2xl"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={submitStopForm} className="p-10 space-y-8">
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
                                    onClick={() => setIsStopModalOpen(false)}
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
                </div>,
                document.body
            )}

            <ConfirmModal
                isOpen={confirmAction.isOpen}
                title={confirmAction.title}
                message={confirmAction.message}
                onConfirm={confirmAction.action}
                onCancel={() => setConfirmAction({ ...confirmAction, isOpen: false })}
            />

            {/* Modal para agregar parada manual */}
            {isManualAddOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-10 border-b border-slate-100/50 relative bg-gradient-to-br from-white to-slate-50">
                            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                                <Search size={28} className="text-white" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                                Registro <span className="text-orange-600">Manual</span>
                            </h3>
                            <button
                                onClick={() => setIsManualAddOpen(false)}
                                className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-2xl"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleManualSubmit} className="p-10 space-y-6">
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
                                    onClick={() => setIsManualAddOpen(false)}
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
                </div>,
                document.body
            )}
        </div>
    )
}

export default PlanningView
