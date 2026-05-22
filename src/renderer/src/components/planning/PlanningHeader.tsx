import React from 'react'
import { Calendar, ChevronLeft, ChevronRight, Zap, Plus, Map as MapIcon } from 'lucide-react'

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
  handleSeedData: () => void
  setIsMonthlyModalOpen: (open: boolean) => void
  handleOpenSimulation: () => void
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
  handleSeedData,
  setIsMonthlyModalOpen,
  handleOpenSimulation,
  handleCreateRoute
}) => {
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] border border-white/40 shadow-premium relative overflow-hidden group w-full">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-100/30 blur-[100px] -mr-48 -mt-48 pointer-events-none group-hover:bg-orange-200/40 transition-all duration-1000" />
      
      <div className="relative z-10">
        <div className="inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-1.5 rounded-full mb-4 shadow-lg shadow-slate-900/20">
          <Zap size={14} className="text-orange-400 fill-orange-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
            Dashboard Operativo
          </span>
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">
          Planeación <span className="text-orange-600">BAMX</span>
        </h1>
        <div className="flex items-center gap-3 mt-3">
          <Calendar size={18} className="text-orange-500" />
          <p className="text-slate-500 font-bold">
            {viewMode === 'day' ? dayName : `Mes de ${monthNames[planMonth]} ${planYear}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 relative z-10">
        <div className="bg-slate-100/50 backdrop-blur-md p-2 rounded-2xl border border-white/60 flex items-center shadow-inner">
          {viewMode === 'day' ? (
            <>
              <button 
                onClick={() => setViewMode('calendar')}
                className="bg-white text-orange-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-50 transition-all border border-orange-100 shadow-sm mr-2 flex items-center gap-2"
              >
                <ChevronLeft size={14} /> Mensual
              </button>
              <button 
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() - 1)
                  setSelectedDate(d.toISOString().split('T')[0])
                }}
                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-white rounded-xl transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent px-4 py-2 text-sm font-black text-slate-900 focus:outline-none cursor-pointer"
              />
              <button 
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() + 1)
                  setSelectedDate(d.toISOString().split('T')[0])
                }}
                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-white rounded-xl transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  if (planMonth === 0) {
                    setPlanMonth(11)
                    setPlanYear(planYear - 1)
                  } else {
                    setPlanMonth(planMonth - 1)
                  }
                }}
                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-white rounded-xl transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-4 py-2 text-sm font-black text-slate-900 uppercase">
                {monthNames[planMonth]} {planYear}
              </div>
              <button 
                onClick={() => {
                  if (planMonth === 11) {
                    setPlanMonth(0)
                    setPlanYear(planYear + 1)
                  } else {
                    setPlanMonth(planMonth + 1)
                  }
                }}
                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-white rounded-xl transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
        
        <button
          onClick={handleSeedData}
          className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center space-x-2 group/seed"
          title="Inyectar Datos de Prueba"
        >
          <Zap size={20} className="text-orange-400" />
          <span className="hidden xl:inline">Inyectar Datos</span>
        </button>

        <button
          onClick={() => setIsMonthlyModalOpen(true)}
          className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center space-x-2 group/month"
        >
          <Calendar size={20} className="group-hover/month:scale-110 transition-transform" />
          <span>Plan Mensual</span>
        </button>

        <button
          onClick={handleOpenSimulation}
          className="bg-white text-blue-600 px-6 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 border border-blue-50 hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex items-center space-x-2 group/btn"
        >
          <MapIcon size={20} className="group-hover/btn:rotate-12 transition-transform" />
          <span>Simular IA</span>
        </button>

        <button
          onClick={handleCreateRoute}
          className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Nueva Ruta</span>
        </button>
      </div>
    </div>
  )
}
