import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, CheckCircle2, Map as MapIcon, Users, Truck, ChevronLeft, ArrowUp, ArrowDown, Repeat, Trash2 } from 'lucide-react'
import { MonthlyPlan } from '../../utils/monthlyScheduler'
import { MapVisualizer } from '../MapVisualizer'
import { exportMonthlyPlanToPDF } from '../../utils/jsPDFRouteExport'
import { FileText } from 'lucide-react'

interface MonthlyPlanModalProps {
  isOpen: boolean
  onClose: () => void
  planMonth: number
  planYear: number
  setPlanMonth: (month: number) => void
  setPlanYear: (year: number) => void
  isGeneratingMonthly: boolean
  handleGenerateMonthlyPlan: () => void
  handleConfirmMonthlyPlan: () => void
  monthlyPlan: MonthlyPlan | null
  calculatePlanStats: (plan: MonthlyPlan) => { totalDistance: string; totalStops: number; activeDays: number; avgStopsPerDay: string }
  reorderStopInDay: (dayIdx: number, truck: 'truckA' | 'truckB', stopIdx: number, direction: 'up' | 'down') => void
  moveStopBetweenTrucks: (dayIdx: number, fromTruck: 'truckA' | 'truckB', stopIdx: number) => void
  removeStopFromDay: (dayIdx: number, truck: 'truckA' | 'truckB', stopIdx: number) => void
  selectedFilters: { supermarkets: boolean; colonies: boolean; beneficiaries: boolean; institutions: boolean }
  setSelectedFilters: React.Dispatch<React.SetStateAction<{ supermarkets: boolean; colonies: boolean; beneficiaries: boolean; institutions: boolean }>>
}

export const MonthlyPlanModal: React.FC<MonthlyPlanModalProps> = ({
  isOpen,
  onClose,
  planMonth,
  planYear,
  setPlanMonth,
  setPlanYear,
  isGeneratingMonthly,
  handleGenerateMonthlyPlan,
  handleConfirmMonthlyPlan,
  monthlyPlan,
  calculatePlanStats,
  reorderStopInDay,
  moveStopBetweenTrucks,
  removeStopFromDay,
  selectedFilters,
  setSelectedFilters
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

  // Restablecer a vista de cuadricula cuando se genera un nuevo plan o se abre el modal
  React.useEffect(() => {
    if (isOpen) setSelectedDayIndex(null);
  }, [isOpen, monthlyPlan]);

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-500">
      <div className="w-full h-full sm:w-[98vw] sm:h-[95vh] bg-white/95 backdrop-blur-3xl rounded-none sm:rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-white/40 overflow-hidden animate-in zoom-in-95 duration-700 flex flex-col pointer-events-auto">
        <div className="p-10 border-b border-indigo-100/50 flex flex-col lg:flex-row lg:items-center justify-between gap-8 shrink-0 bg-gradient-to-br from-indigo-50/50 via-white to-transparent">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-indigo-600 rounded-[2rem] shadow-2xl shadow-indigo-200 ring-4 ring-indigo-50">
              <Calendar className="text-white" size={32} />
            </div>
            <div>
              <h3 className="text-4xl font-black text-indigo-950 tracking-tighter">
                Planeación <span className="text-indigo-600">Estratégica</span>
              </h3>
              <div className="flex items-center gap-4 mt-2">
                <select
                  value={planMonth}
                  onChange={(e) => setPlanMonth(parseInt(e.target.value))}
                  className="bg-indigo-50 border-none text-indigo-900 font-black text-[11px] uppercase tracking-widest px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  value={planYear}
                  onChange={(e) => setPlanYear(parseInt(e.target.value))}
                  className="bg-indigo-50 border-none text-indigo-900 font-black text-[11px] uppercase tracking-widest px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={handleGenerateMonthlyPlan}
                  disabled={isGeneratingMonthly}
                  className="bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-200 transition-all disabled:opacity-50"
                >
                  Generar Plan
                </button>
              </div>

              {/* Selector de tipo de paradas/filtros premium */}
              <div className="flex flex-wrap items-center gap-3 mt-4 bg-indigo-50/30 p-2.5 rounded-2xl border border-indigo-100/30">
                <span className="text-[10px] font-black text-indigo-950/60 uppercase tracking-[0.15em] mr-1">Incluir en ruta:</span>
                <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-100/50 bg-white text-[10px] font-black uppercase cursor-pointer hover:bg-indigo-50/50 transition-all shadow-sm">
                  <input 
                    type="checkbox" 
                    checked={selectedFilters.supermarkets} 
                    onChange={() => setSelectedFilters(prev => ({ ...prev, supermarkets: !prev.supermarkets }))}
                    className="accent-indigo-600 rounded w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-indigo-950">Supermercados</span>
                </label>
                <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-100/50 bg-white text-[10px] font-black uppercase cursor-pointer hover:bg-indigo-50/50 transition-all shadow-sm">
                  <input 
                    type="checkbox" 
                    checked={selectedFilters.colonies} 
                    onChange={() => setSelectedFilters(prev => ({ ...prev, colonies: !prev.colonies }))}
                    className="accent-indigo-600 rounded w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-indigo-950">Colonias</span>
                </label>
                <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-100/50 bg-white text-[10px] font-black uppercase cursor-pointer hover:bg-indigo-50/50 transition-all shadow-sm">
                  <input 
                    type="checkbox" 
                    checked={selectedFilters.institutions} 
                    onChange={() => setSelectedFilters(prev => ({ ...prev, institutions: !prev.institutions }))}
                    className="accent-indigo-600 rounded w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-indigo-950">Instituciones</span>
                </label>
                <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-100/50 bg-white text-[10px] font-black uppercase cursor-pointer hover:bg-indigo-50/50 transition-all shadow-sm">
                  <input 
                    type="checkbox" 
                    checked={selectedFilters.beneficiaries} 
                    onChange={() => setSelectedFilters(prev => ({ ...prev, beneficiaries: !prev.beneficiaries }))}
                    className="accent-indigo-600 rounded w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-indigo-950">Beneficiarios</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/50 p-2 rounded-3xl border border-indigo-50 shadow-sm">
            <button
              onClick={onClose}
              className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all uppercase text-xs tracking-widest"
            >
              Descartar
            </button>
            {monthlyPlan && (
              <button
                onClick={() => {
                  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                  exportMonthlyPlanToPDF(monthlyPlan, monthNames[planMonth], planYear)
                }}
                className="bg-orange-100 text-orange-600 px-8 py-5 rounded-2xl font-black hover:bg-orange-200 transition-all uppercase text-xs tracking-widest flex items-center gap-2"
              >
                <FileText size={20} />
                Exportar PDF
              </button>
            )}
            <button
              onClick={handleConfirmMonthlyPlan}
              className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 uppercase text-xs tracking-[0.2em] flex items-center gap-3"
            >
              <CheckCircle2 size={20} />
              Confirmar y Guardar
            </button>
          </div>
        </div>

        <div className={`flex-1 p-6 lg:p-8 bg-slate-50/30 flex flex-col ${selectedDayIndex === null ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          {isGeneratingMonthly ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-24 h-24 border-8 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
                <Calendar className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={32} />
              </div>
              <h4 className="text-2xl font-black text-indigo-900 mt-8 tracking-tight">Generando Inteligencia Logística</h4>
              <p className="text-slate-400 mt-2 font-medium">Consultando distancias reales (OSRM) y optimizando con IA...</p>
            </div>
          ) : monthlyPlan && selectedDayIndex === null ? (
            <div className="w-full mx-auto space-y-12">
              {/* Tarjetas de estadisticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: 'Eficiencia de Ruta', value: `${calculatePlanStats(monthlyPlan).totalDistance} km`, icon: <MapIcon size={24} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                  { label: 'Impacto Social', value: calculatePlanStats(monthlyPlan).totalStops, icon: <Users size={24} />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                  { label: 'Días Operativos', value: calculatePlanStats(monthlyPlan).activeDays, icon: <Calendar size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Caudal Diario', value: `${calculatePlanStats(monthlyPlan).avgStopsPerDay}`, icon: <Truck size={24} />, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' }
                ].map((stat, i) => (
                  <div key={i} className={`bg-white p-8 rounded-[2.5rem] border ${stat.border} shadow-premium flex items-center gap-6 transition-all hover:scale-[1.02]`}>
                    <div className={`p-5 rounded-3xl ${stat.bg} ${stat.color} shadow-inner`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                      <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {monthlyPlan.days.map((day, idx) => {
                  const stopsA = day.truckA.stops.length;
                  const stopsB = day.truckB.stops.length;
                  const isRestDay = stopsA === 0 && stopsB === 0;
                  const dayDate = new Date(day.date + 'T12:00:00');
                  const dayLabel = new Intl.DateTimeFormat('es-MX', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  }).format(dayDate);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`rounded-[3rem] p-8 border transition-all duration-500 overflow-hidden relative group cursor-pointer ${isRestDay ? 'bg-slate-100/30 border-slate-200' : 'bg-white border-slate-100 shadow-premium hover:shadow-2xl hover:border-indigo-200 hover:scale-[1.02]'}`}
                    >
                      <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-50 relative z-10">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Día {idx + 1}</span>
                          <span className="text-lg font-black text-slate-900 tracking-tight capitalize leading-none">{dayLabel}</span>
                        </div>
                        {isRestDay ? (
                          <div className="px-3 py-1 bg-slate-200/50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">Descanso</div>
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Truck size={18} />
                          </div>
                        )}
                      </div>

                      <div className="relative z-10">
                        {isRestDay ? (
                          <div className="py-12 text-center">
                            <Calendar size={32} className="mx-auto text-slate-200 mb-3 opacity-50" />
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Pausa Operativa</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50 group-hover:bg-orange-50/50 transition-colors">
                              <div className="flex items-center justify-between mb-3 text-[9px] font-black uppercase tracking-widest">
                                <span className="text-orange-600">Unidad A (Juan)</span>
                                <span className="text-slate-400">{stopsA} Serv.</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {day.truckA.stops.map((s, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-white text-[9px] font-bold text-slate-700 rounded-lg border border-slate-100 shadow-sm max-w-full truncate" title={s.name}>
                                    {s.name}
                                  </span>
                                ))}
                                {stopsA === 0 && <span className="text-[9px] text-slate-300 italic">No asignado</span>}
                              </div>
                            </div>

                            <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50 group-hover:bg-blue-50/50 transition-colors">
                              <div className="flex items-center justify-between mb-3 text-[9px] font-black uppercase tracking-widest">
                                <span className="text-blue-600">Unidad B (General)</span>
                                <span className="text-slate-400">{stopsB} Serv.</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {day.truckB.stops.map((s, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-white text-[9px] font-bold text-slate-700 rounded-lg border border-slate-100 shadow-sm max-w-full truncate" title={s.name}>
                                    {s.name}
                                  </span>
                                ))}
                                {stopsB === 0 && <span className="text-[9px] text-slate-300 italic">No asignado</span>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Brillos de fondo para dias que no son de descanso */}
                      {!isRestDay && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 blur-[60px] -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-100/50 transition-colors" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : monthlyPlan && selectedDayIndex !== null ? (
            <div className="w-full mx-auto flex flex-col h-full space-y-4 animate-in slide-in-from-right-8 duration-500 min-h-0">
              <div className="flex items-center justify-between bg-white p-4 px-6 rounded-3xl border border-indigo-100 shadow-sm shrink-0">
                <button
                  onClick={() => setSelectedDayIndex(null)}
                  className="flex items-center gap-3 px-5 py-2.5 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest"
                >
                  <ChevronLeft size={16} />
                  Volver al Calendario
                </button>
                <div className="text-right">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Día Seleccionado</p>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">
                    {new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(monthlyPlan.days[selectedDayIndex].date + 'T12:00:00'))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                <div className="space-y-4 overflow-y-auto pr-2">
                  {['truckA', 'truckB'].map((truckKey) => {
                    const truckData = monthlyPlan.days[selectedDayIndex][truckKey as 'truckA' | 'truckB'];
                    const isTruckA = truckKey === 'truckA';

                    return (
                      <div key={truckKey} className={`p-6 rounded-[2.5rem] border shadow-premium ${isTruckA ? 'bg-orange-50/20 border-orange-100' : 'bg-blue-50/20 border-blue-100'}`}>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${isTruckA ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>
                              <Truck size={20} />
                            </div>
                        <div>
                              <h4 className="font-black text-slate-900 text-xl tracking-tight">
                                {isTruckA ? 'Unidad A (Juan)' : 'Unidad B (General)'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{truckData.stops.length} Paradas</p>
                                {truckData.stats && (
                                  <>
                                    <span className="text-slate-200">·</span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{truckData.stats.distanceKm} km</p>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                                      truckData.stats.fromOSRM
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : 'bg-amber-100 text-amber-600'
                                    }`}>
                                      {truckData.stats.fromOSRM ? 'OSRM ✓' : 'Haversine'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {truckData.stops.length > 0 && (
                            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center font-black text-xs">
                                  ▶
                                </div>
                                <div>
                                  <p className="font-black text-white text-sm leading-none">CEDIS BAMX (Salida)</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[9px] font-black text-orange-400 uppercase">Inicio de Ruta</p>
                                    <p className="text-[9px] font-black text-blue-300">🕐 07:00</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {truckData.stops.map((stop, sIdx) => (
                            <div key={sIdx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group/stop hover:border-indigo-400 transition-all">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs">
                                  {sIdx + 1}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-sm leading-none">{stop.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">{stop.type}</p>
                                    {stop.estimatedArrival && (
                                      <>
                                        <span className="text-slate-200">·</span>
                                        <p className="text-[9px] font-black text-indigo-500">🕐 {stop.estimatedArrival}</p>
                                      </>
                                    )}
                                    {stop.transitMinutes != null && stop.transitMinutes > 0 && (
                                      <>
                                        <span className="text-slate-200">·</span>
                                        <p className="text-[9px] font-medium text-slate-400">{Math.round(stop.transitMinutes)} min tránsito</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover/stop:opacity-100 transition-all">
                                <button
                                  onClick={() => reorderStopInDay(selectedDayIndex, truckKey as 'truckA' | 'truckB', sIdx, 'up')}
                                  disabled={sIdx === 0}
                                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onClick={() => reorderStopInDay(selectedDayIndex, truckKey as 'truckA' | 'truckB', sIdx, 'down')}
                                  disabled={sIdx === truckData.stops.length - 1}
                                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  onClick={() => moveStopBetweenTrucks(selectedDayIndex, truckKey as 'truckA' | 'truckB', sIdx)}
                                  className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-400 hover:text-indigo-600"
                                  title="Mover de Camión"
                                >
                                  <Repeat size={14} />
                                </button>
                                <button
                                  onClick={() => removeStopFromDay(selectedDayIndex, truckKey as 'truckA' | 'truckB', sIdx)}
                                  className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {truckData.stops.length > 0 && (
                            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center font-black text-xs">
                                  ■
                                </div>
                                <div>
                                  <p className="font-black text-white text-sm leading-none">CEDIS BAMX (Llegada)</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[9px] font-black text-orange-400 uppercase">Fin de Ruta</p>
                                    {(() => {
                                      if (truckData.stats?.durationMinutes) {
                                        const totalMin = 7 * 60 + truckData.stats.durationMinutes;
                                        const h = Math.floor(totalMin / 60) % 24;
                                        const m = Math.round(totalMin % 60);
                                        return <p className="text-[9px] font-black text-blue-300">🕐 {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</p>;
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {truckData.stops.length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin Servicios</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-950 rounded-[3rem] overflow-hidden shadow-2xl relative isolate h-full min-h-[400px]">
                  <div className="absolute top-6 left-6 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                    <div className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Vista Satelital Operativa
                    </div>
                  </div>
                  <MapVisualizer
                    hideSidebar={true}
                    route={[
                      ...monthlyPlan.days[selectedDayIndex].truckA.stops.map(s => ({ ...s, truck: 'A' as const })),
                      ...monthlyPlan.days[selectedDayIndex].truckB.stops.map(s => ({ ...s, truck: 'B' as const }))
                    ]}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
