import React from 'react'
import { CalendarDays, Plus } from 'lucide-react'

interface CalendarGridProps {
  planYear: number
  planMonth: number
  monthSummary: any[]
  setSelectedDate: (date: string) => void
  setViewMode: (mode: 'calendar' | 'day') => void
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  planYear,
  planMonth,
  monthSummary,
  setSelectedDate,
  setViewMode
}) => {
  const firstDayOffset = new Date(planYear, planMonth, 1).getDay()
  const daysInMonth = new Date(planYear, planMonth + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-7 gap-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400"
          >
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOffset }).map((_, index) => (
          <div key={`empty-${index}`} className="min-h-28 rounded-lg bg-slate-50" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const dayNum = index + 1
          const dateStr = `${planYear}-${String(planMonth + 1).padStart(2, '0')}-${String(
            dayNum
          ).padStart(2, '0')}`
          const summary = monthSummary.find((item) => item.date === dateStr)
          const isToday = today === dateStr
          const routeCount = summary?.routes_count || 0

          return (
            <button
              key={dateStr}
              onClick={() => {
                setSelectedDate(dateStr)
                setViewMode('day')
              }}
              className={`group flex min-h-28 flex-col rounded-lg border p-3 text-left transition-colors ${
                isToday
                  ? 'border-orange-500 bg-orange-50'
                  : routeCount > 0
                    ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-sm font-black text-slate-950">{dayNum}</span>
                {routeCount > 0 ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                    {routeCount} {routeCount === 1 ? 'ruta' : 'rutas'}
                  </span>
                ) : (
                  <Plus className="opacity-0 text-slate-300 transition-opacity group-hover:opacity-100" size={18} />
                )}
              </div>

              <div className="mt-auto">
                {routeCount > 0 ? (
                  <>
                    <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <CalendarDays size={14} />
                      {summary.total_volume || 0} unidades
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(((summary.total_volume || 0) / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs font-medium text-slate-400">Sin rutas</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
