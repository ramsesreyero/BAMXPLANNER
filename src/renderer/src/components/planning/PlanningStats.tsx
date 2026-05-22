import React from 'react'
import { MapPin, Package, Truck, DollarSign } from 'lucide-react'

interface PlanningStatsProps {
  viewMode: 'calendar' | 'day'
  currentStats: {
    totalStops: number
    totalVolume: number
    activeUnits: number
    totalRecovery: number
  }
}

export const PlanningStats: React.FC<PlanningStatsProps> = ({
  viewMode,
  currentStats
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { label: viewMode === 'day' ? 'Paradas Totales' : 'Rutas Totales', value: currentStats.totalStops, icon: <MapPin />, color: 'orange' },
        { label: 'Volumen Total', value: `${currentStats.totalVolume} Unid.`, icon: <Package />, color: 'blue' },
        { label: viewMode === 'day' ? 'Unidades Activas' : 'Días Activos', value: currentStats.activeUnits, icon: <Truck />, color: 'indigo' },
        { label: 'Recaudación Est.', value: `$${currentStats.totalRecovery}`, icon: <DollarSign />, color: 'emerald' },
      ].map((stat, i) => (
        <div key={i} className="bg-white/60 backdrop-blur-lg p-6 rounded-[2rem] border border-white shadow-premium flex items-center gap-5 group hover:bg-white transition-all hover:scale-[1.02]">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${
            stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
            stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
            stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
            'bg-emerald-50 text-emerald-600'
          }`}>
            {stat.icon}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
