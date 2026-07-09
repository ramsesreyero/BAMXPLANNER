import React from 'react'
import { Plus } from 'lucide-react'

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
  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white shadow-premium p-10 animate-in zoom-in-95 duration-500">
      <div className="grid grid-cols-7 gap-4">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
          <div key={d} className="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
        ))}
        {/* Espacios vacios del calendario antes de que inicie el mes */}
        {Array.from({ length: new Date(planYear, planMonth, 1).getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-slate-50/30 rounded-[2rem] border border-dashed border-slate-100" />
        ))}
        {/* Dias del mes */}
        {Array.from({ length: new Date(planYear, planMonth + 1, 0).getDate() }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${planYear}-${String(planMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const summary = monthSummary.find(s => s.date === dateStr);
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <button
              key={dayNum}
              onClick={() => {
                setSelectedDate(dateStr);
                setViewMode('day');
              }}
              className={`group aspect-square p-6 rounded-[2.5rem] border transition-all relative overflow-hidden flex flex-col items-center justify-between text-left ${
                isToday
                  ? 'bg-orange-600 border-orange-500 shadow-xl shadow-orange-200'
                  : summary
                    ? 'bg-white border-slate-100 hover:border-orange-200 hover:shadow-premium'
                    : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
            >
              <div className="relative z-10 w-full flex justify-between items-start">
                <span className={`text-sm font-black ${isToday ? 'text-white' : 'text-slate-900 group-hover:text-orange-600'}`}>{dayNum}</span>
                {summary && (
                  <div className="flex flex-col items-end">
                    <span className={`text-[8px] font-black uppercase tracking-tighter ${isToday ? 'text-orange-200' : 'text-orange-500'}`}>
                      {summary.routes_count} rutas
                    </span>
                  </div>
                )}
              </div>

              {summary && (
                <div className="relative z-10 w-full mt-auto">
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${isToday ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${isToday ? 'bg-white' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min((summary.total_volume / 1000) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-[8px] font-bold ${isToday ? 'text-orange-100' : 'text-slate-400'}`}>Capacidad</span>
                    <span className={`text-[9px] font-black ${isToday ? 'text-white' : 'text-slate-900'}`}>
                      {summary.total_volume} u. | ${summary.total_recovery?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {!summary && !isToday && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={24} className="text-orange-200" />
                </div>
              )}

              {/* Decoracion */}
              {summary && !isToday && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-orange-100 transition-colors" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  )
}
