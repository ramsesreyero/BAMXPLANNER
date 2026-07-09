import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Map,
  Repeat,
  Trash2,
  Truck,
  Wand2,
  X
} from 'lucide-react'
import { MonthlyPlan } from '../../utils/monthlyScheduler'
import { MapVisualizer } from '../MapVisualizer'
import { exportMonthlyPlanToPDF } from '../../utils/jsPDFRouteExport'

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
  calculatePlanStats: (plan: MonthlyPlan) => {
    totalDistance: string
    totalStops: number
    activeDays: number
    avgStopsPerDay: string
  }
  reorderStopInDay: (
    dayIdx: number,
    truck: 'truckA' | 'truckB',
    stopIdx: number,
    direction: 'up' | 'down'
  ) => void
  moveStopBetweenTrucks: (dayIdx: number, fromTruck: 'truckA' | 'truckB', stopIdx: number) => void
  removeStopFromDay: (dayIdx: number, truck: 'truckA' | 'truckB', stopIdx: number) => void
  dragAndDropStop?: (
    dayIdx: number,
    fromTruck: 'truckA' | 'truckB',
    fromIdx: number,
    toTruck: 'truckA' | 'truckB',
    toIdx: number
  ) => void
  selectedFilters: {
    supermarkets: boolean
    colonies: boolean
    beneficiaries: boolean
    institutions: boolean
  }
  setSelectedFilters: React.Dispatch<
    React.SetStateAction<{
      supermarkets: boolean
      colonies: boolean
      beneficiaries: boolean
      institutions: boolean
    }>
  >
}

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

const filterLabels = [
  { key: 'supermarkets', label: 'Supermercados' },
  { key: 'colonies', label: 'Colonias' },
  { key: 'institutions', label: 'Instituciones' },
  { key: 'beneficiaries', label: 'Caridad' }
] as const

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
  dragAndDropStop,
  selectedFilters,
  setSelectedFilters
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
  const [draggedItem, setDraggedItem] = useState<{
    truckKey: 'truckA' | 'truckB'
    stopIndex: number
  } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<{
    truckKey: 'truckA' | 'truckB'
    stopIndex: number | 'container'
  } | null>(null)

  useEffect(() => {
    if (isOpen) setSelectedDayIndex(null)
  }, [isOpen])

  if (!isOpen) return null

  const stats = monthlyPlan ? calculatePlanStats(monthlyPlan) : null
  const selectedDay =
    monthlyPlan && selectedDayIndex !== null ? monthlyPlan.days[selectedDayIndex] : null

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-700">Planeación mensual</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {monthNames[planMonth]} {planYear}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={planMonth}
                onChange={(e) => setPlanMonth(parseInt(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900"
              >
                {monthNames.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={planYear}
                onChange={(e) => setPlanYear(parseInt(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900"
              >
                {[2024, 2025, 2026, 2027].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                onClick={handleGenerateMonthlyPlan}
                disabled={isGeneratingMonthly}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                <Wand2 size={17} />
                Generar rutas
              </button>

              {monthlyPlan && (
                <button
                  onClick={() => exportMonthlyPlanToPDF(monthlyPlan, monthNames[planMonth], planYear)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <FileText size={17} />
                  PDF
                </button>
              )}

              <button
                onClick={handleConfirmMonthlyPlan}
                disabled={!monthlyPlan}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 size={17} />
                Guardar plan
              </button>

              <button
                onClick={onClose}
                className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Incluir:</span>
            {filterLabels.map((item) => (
              <label
                key={item.key}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  selectedFilters[item.key]
                    ? 'border-orange-200 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFilters[item.key]}
                  onChange={() =>
                    setSelectedFilters((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                  }
                  className="accent-orange-600"
                />
                {item.label}
              </label>
            ))}
          </div>
        </header>

        {isGeneratingMonthly ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-700">
              <Wand2 className="animate-pulse" size={30} />
            </div>
            <h3 className="text-xl font-black text-slate-950">Generando rutas</h3>
            <p className="mt-2 text-sm text-slate-500">
              Calculando distancias, agrupando paradas y preparando el calendario.
            </p>
          </div>
        ) : !monthlyPlan ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <Calendar className="mx-auto text-slate-300" size={44} />
              <h3 className="mt-4 text-xl font-black text-slate-950">Aún no hay vista previa</h3>
              <p className="mt-2 text-sm text-slate-500">
                Elige qué tipos de paradas incluir y presiona “Generar rutas”.
              </p>
            </div>
          </div>
        ) : selectedDay ? (
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <button
                onClick={() => setSelectedDayIndex(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft size={17} />
                Volver al mes
              </button>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500">Día seleccionado</p>
                <p className="font-black capitalize text-slate-950">
                  {new Intl.DateTimeFormat('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  }).format(new Date(selectedDay.date + 'T12:00:00'))}
                </p>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-2">
              <div className="space-y-4 overflow-y-auto pr-1">
                {(['truckA', 'truckB'] as const).map((truckKey) => {
                  const truckData = selectedDay[truckKey]
                  const truckLabel = truckKey === 'truckA' ? 'Ruta A' : 'Ruta B'
                  const tone = truckKey === 'truckA' ? 'orange' : 'blue'

                  return (
                    <section key={truckKey} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              tone === 'orange'
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            <Truck size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-950">{truckLabel}</h4>
                            <p className="text-xs font-semibold text-slate-500">
                              {truckData.stops.length} paradas
                              {truckData.stats ? ` · ${truckData.stats.distanceKm} km` : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`space-y-2 p-1.5 rounded-xl border-2 transition-all duration-300 ${
                          dragOverItem?.truckKey === truckKey && dragOverItem?.stopIndex === 'container'
                            ? 'bg-orange-50/20 border-dashed border-orange-400'
                            : 'border-transparent'
                        }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => {
                          if (truckData.stops.length === 0) {
                            setDragOverItem({ truckKey, stopIndex: 'container' })
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverItem?.stopIndex === 'container') {
                            setDragOverItem(null)
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOverItem(null)
                          if (!draggedItem) return
                          if (draggedItem.truckKey === truckKey && draggedItem.stopIndex === truckData.stops.length) return
                          if (dragAndDropStop) {
                            dragAndDropStop(selectedDayIndex!, draggedItem.truckKey, draggedItem.stopIndex, truckKey, truckData.stops.length)
                          }
                        }}
                      >
                        {truckData.stats && truckData.stats.optimized === false && (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                            <AlertTriangle className="mt-0.5 shrink-0" size={16} />
                            <p className="text-xs font-bold">
                              Esta ruta supera el horario o la jornada configurada. Conviene mover paradas a otro día o unidad.
                            </p>
                          </div>
                        )}
                        {truckData.stops.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">
                            Sin paradas asignadas
                          </div>
                        ) : (
                          truckData.stops.map((stop, stopIndex) => (
                            <div
                              key={`${stop.id}-${stopIndex}`}
                              draggable={true}
                              onDragStart={(e) => {
                                setDraggedItem({ truckKey, stopIndex })
                                e.dataTransfer.effectAllowed = 'move'
                              }}
                              onDragEnd={() => {
                                setDraggedItem(null)
                                setDragOverItem(null)
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={() => {
                                setDragOverItem({ truckKey, stopIndex })
                              }}
                              onDragLeave={() => {
                                if (dragOverItem?.stopIndex === stopIndex && dragOverItem?.truckKey === truckKey) {
                                  setDragOverItem(null)
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                setDragOverItem(null)
                                if (!draggedItem) return
                                if (draggedItem.truckKey === truckKey && draggedItem.stopIndex === stopIndex) return
                                if (dragAndDropStop) {
                                  dragAndDropStop(selectedDayIndex!, draggedItem.truckKey, draggedItem.stopIndex, truckKey, stopIndex)
                                }
                              }}
                              className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all duration-250 ${
                                dragOverItem?.truckKey === truckKey && dragOverItem?.stopIndex === stopIndex
                                  ? 'border-orange-500 bg-orange-50/50 scale-[1.01] shadow-md'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-black text-slate-600">
                                  {stopIndex + 1}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-950">{stop.name}</p>
                                  <p className="text-xs font-medium text-slate-500">
                                    {stop.type}
                                    {stop.estimatedArrival ? ` · ${stop.estimatedArrival}` : ''}
                                    {stop.reprogrammedFrom ? ` · movido desde ${stop.reprogrammedFrom}` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  onClick={() => reorderStopInDay(selectedDayIndex!, truckKey, stopIndex, 'up')}
                                  disabled={stopIndex === 0}
                                  className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                                  title="Subir"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onClick={() => reorderStopInDay(selectedDayIndex!, truckKey, stopIndex, 'down')}
                                  disabled={stopIndex === truckData.stops.length - 1}
                                  className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                                  title="Bajar"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  onClick={() => moveStopBetweenTrucks(selectedDayIndex!, truckKey, stopIndex)}
                                  className="rounded-md p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                                  title="Mover a la otra ruta"
                                >
                                  <Repeat size={14} />
                                </button>
                                <button
                                  onClick={() => removeStopFromDay(selectedDayIndex!, truckKey, stopIndex)}
                                  className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                                  title="Quitar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  )
                })}
              </div>

              <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow">
                  <Map size={15} />
                  Mapa del día
                </div>
                <MapVisualizer
                  hideSidebar={true}
                  route={[
                    ...selectedDay.truckA.stops.map((stop) => ({ ...stop, truck: 'A' as const })),
                    ...selectedDay.truckB.stops.map((stop) => ({ ...stop, truck: 'B' as const }))
                  ]}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
            {stats && (
              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">Km estimados</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{stats.totalDistance}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">Paradas</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{stats.totalStops}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">Días con ruta</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{stats.activeDays}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">Promedio diario</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{stats.avgStopsPerDay}</p>
                </div>
              </div>
            )}

            {monthlyPlan.warnings && monthlyPlan.warnings.length > 0 && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={20} />
                  <div>
                    <h3 className="text-sm font-black text-amber-950">
                      Ajustes automáticos de planeación
                    </h3>
                    <p className="mt-1 text-xs font-medium text-amber-800">
                      {monthlyPlan.warnings.filter((warning) => warning.type === 'reprogrammed').length} reprogramados ·{' '}
                      {monthlyPlan.warnings.filter((warning) => warning.type === 'omitted').length} sin acomodo
                    </p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {monthlyPlan.warnings.slice(0, 6).map((warning, index) => (
                        <div key={`${warning.stopName}-${index}`} className="rounded-lg bg-white/70 p-3 text-xs text-amber-950">
                          <p className="font-black">{warning.stopName}</p>
                          <p className="mt-1 font-medium">
                            {warning.type === 'reprogrammed'
                              ? `${warning.originalDate} -> ${warning.newDate}`
                              : `Sin acomodo desde ${warning.originalDate}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {monthlyPlan.days.map((day, index) => {
                const stopsA = day.truckA.stops.length
                const stopsB = day.truckB.stops.length
                const totalStops = stopsA + stopsB
                const dayDate = new Date(day.date + 'T12:00:00')

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDayIndex(index)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      totalStops > 0
                        ? 'border-emerald-200 bg-white hover:bg-emerald-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          {new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(dayDate)}
                        </p>
                        <p className="mt-1 text-xl font-black text-slate-950">{dayDate.getDate()}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          totalStops > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {totalStops > 0 ? `${totalStops} paradas` : 'Descanso'}
                      </span>
                    </div>
                    {totalStops > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                        <div className="rounded-lg bg-orange-50 p-2 text-orange-700">A: {stopsA}</div>
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-700">B: {stopsB}</div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
