import React from 'react'
import { ChevronLeft, ChevronRight, Plus, Wand2 } from 'lucide-react'

interface PlanningHeaderProps {
  viewMode: 'calendar' | 'day'
  dayName: string
  planMonth: number
  planYear: number
  selectedDate: string
  setViewMode: (mode: 'calendar' | 'day') => void
  setSelectedDate: (date: string) => void
  setPlanMonth: (month: number) => void
  setPlanYear: (year: number) => void
  setIsMonthlyModalOpen: (open: boolean) => void
  handleCreateRoute: () => void
}

export const PlanningHeader: React.FC<PlanningHeaderProps> = ({
  viewMode,
  dayName,
  planMonth,
  planYear,
  selectedDate,
  setViewMode,
  setSelectedDate,
  setPlanMonth,
  setPlanYear,
  setIsMonthlyModalOpen,
  handleCreateRoute
}) => {
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

  const moveMonth = (direction: -1 | 1) => {
    if (direction === -1 && planMonth === 0) {
      setPlanMonth(11)
      setPlanYear(planYear - 1)
      return
    }
    if (direction === 1 && planMonth === 11) {
      setPlanMonth(0)
      setPlanYear(planYear + 1)
      return
    }
    setPlanMonth(planMonth + direction)
  }

  const moveDay = (direction: -1 | 1) => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + direction)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-orange-700">
            {viewMode === 'day' ? 'Detalle del día' : 'Calendario mensual'}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            {viewMode === 'day' ? dayName : `${monthNames[planMonth]} ${planYear}`}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Genera rutas, revisa cargas y deja listo lo que se enviará a cada conductor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
            {viewMode === 'day' ? (
              <>
                <button
                  onClick={() => setViewMode('calendar')}
                  className="rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
                >
                  Mes
                </button>
                <button
                  onClick={() => moveDay(-1)}
                  className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-slate-950"
                  title="Día anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent px-2 py-2 text-sm font-bold text-slate-900 outline-none"
                />
                <button
                  onClick={() => moveDay(1)}
                  className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-slate-950"
                  title="Día siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => moveMonth(-1)}
                  className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-slate-950"
                  title="Mes anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-36 px-3 py-2 text-center text-sm font-black text-slate-950">
                  {monthNames[planMonth]} {planYear}
                </div>
                <button
                  onClick={() => moveMonth(1)}
                  className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-slate-950"
                  title="Mes siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setIsMonthlyModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700"
          >
            <Wand2 size={18} />
            Generar plan
          </button>

          <button
            onClick={handleCreateRoute}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={18} />
            Ruta manual
          </button>
        </div>
      </div>
    </div>
  )
}
