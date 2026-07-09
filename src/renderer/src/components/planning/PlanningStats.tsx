import React from 'react'
import { DollarSign, MapPin, Package, Truck } from 'lucide-react'

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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      {[
        { label: viewMode === 'day' ? 'Paradas' : 'Rutas guardadas', value: currentStats.totalStops, icon: <MapPin />, color: 'orange' },
        { label: 'Volumen estimado', value: `${currentStats.totalVolume} unid.`, icon: <Package />, color: 'blue' },
        { label: viewMode === 'day' ? 'Unidades en uso' : 'Días con rutas', value: currentStats.activeUnits, icon: <Truck />, color: 'indigo' },
        { label: 'Recuperación', value: `$${currentStats.totalRecovery}`, icon: <DollarSign />, color: 'emerald' },
      ].map((stat, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${
            stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
            stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
            stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
            'bg-emerald-50 text-emerald-600'
          }`}>
            {stat.icon}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
            <p className="text-2xl font-black text-slate-950">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
