import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MapPin, Building2, ShoppingCart, Truck,
  Users, CalendarDays, Settings, Heart, History as HistoryIcon
} from 'lucide-react'

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={`group flex items-center space-x-3 py-2.5 px-4 rounded-2xl transition-all duration-500 ease-out ${isActive
        ? 'bg-gradient-to-tr from-orange-600 to-red-600 text-white shadow-xl shadow-orange-600/30 -translate-y-0.5'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
        }`}
    >
      <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        <Icon size={18} />
      </div>
      <span className={`font-semibold text-sm tracking-tight transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
        {label}
      </span>
    </Link>
  )
}

export const Sidebar = () => {
  const [capacity, setCapacity] = useState({ percentage: 0, text: '...' })

  useEffect(() => {
    const fetchCapacity = async () => {
      try {
        const routes = await window.api.planning.getRoutes(new Date().toISOString().split('T')[0])
        const activeRoutes = routes ? routes.length : 0
        const maxRoutes = 10 // Asumiendo que 10 rutas al dia es el 100% de capacidad
        const percentage = Math.min(Math.round((activeRoutes / maxRoutes) * 100), 100)
        setCapacity({ percentage, text: `${percentage}%` })
      } catch (err) {
        setCapacity({ percentage: 0, text: '0%' })
      }
    }
    fetchCapacity()
  }, [])

  return (
    <aside className="w-72 bg-slate-950 border-r border-white/5 text-white flex flex-col shadow-2xl z-20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/15 blur-[100px] -mr-32 -mt-32 pointer-events-none" />

      <div className="p-8 border-b border-white/5 relative">
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 bg-gradient-to-tr from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-600/40 ring-2 ring-white/20 animate-in zoom-in-50 duration-700">
            <Heart className="text-white" size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-black leading-none tracking-tighter">
              BAMX <span className="text-orange-500">Planner</span>
            </h1>
            <p className="text-[9px] text-slate-500 mt-1.5 uppercase tracking-[0.3em] font-black">
              Logística Avanzada
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide relative">
        <div className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none">
          General
        </div>
        <NavItem to="/" icon={LayoutDashboard} label="Panel" />
        <NavItem to="/planeacion" icon={CalendarDays} label="Planeación" />
        <NavItem to="/historial" icon={HistoryIcon} label="Historial" />

        <div className="px-4 py-3 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none">
          Gestión
        </div>
        <NavItem to="/colonias" icon={MapPin} label="Colonias" />
        <NavItem to="/instituciones" icon={Building2} label="Instituciones" />
        <NavItem to="/supermercados" icon={ShoppingCart} label="Súper" />
        <NavItem to="/caridad" icon={Heart} label="Caridad" />
        <NavItem to="/almacen" icon={Building2} label="Almacén" />

        <div className="px-4 py-3 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none">
          Logística
        </div>
        <NavItem to="/unidades" icon={Truck} label="Unidades" />
        <NavItem to="/choferes" icon={Users} label="Choferes" />
      </nav>

      <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm relative">
        <div className="bg-slate-800/40 rounded-xl p-3 mb-3 border border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Uso de Flota (Hoy)
            </span>
            <span className="text-[10px] text-orange-400 font-bold tracking-tighter">{capacity.text}</span>
          </div>
          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${capacity.percentage}%` }} />
          </div>
        </div>
        <NavItem to="/configuracion" icon={Settings} label="Ajustes" />
      </div>

      <div className="p-6 border-t border-white/5 relative bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center space-x-4 group cursor-pointer p-2.5 rounded-2xl hover:bg-white/5 transition-all duration-300">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:border-orange-500/50 transition-colors">
            <Users size={20} className="text-slate-400 group-hover:text-orange-400 transition-colors" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate tracking-tight">
              Admin BAMX
            </p>
            <p className="text-[10px] text-slate-500 font-bold truncate uppercase tracking-widest mt-0.5">
              {new Date().toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short'
              })} • Operativo
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
