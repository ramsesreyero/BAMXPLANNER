import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  Heart,
  History,
  Home,
  MapPin,
  Settings,
  ShoppingCart,
  Truck,
  Users
} from 'lucide-react'

const primaryNav = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/planeacion', icon: CalendarDays, label: 'Planeación' },
  { to: '/historial', icon: History, label: 'Historial' }
]

const catalogNav = [
  { to: '/colonias', icon: MapPin, label: 'Colonias' },
  { to: '/instituciones', icon: Building2, label: 'Instituciones' },
  { to: '/supermercados', icon: ShoppingCart, label: 'Supermercados' },
  { to: '/caridad', icon: Heart, label: 'Caridad' },
  { to: '/unidades', icon: Truck, label: 'Unidades' },
  { to: '/choferes', icon: Users, label: 'Choferes' }
]

const NavItem = ({
  to,
  icon: Icon,
  label
}: {
  to: string
  icon: React.ElementType
  label: string
}) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
        isActive
          ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-100'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )
}

export const Sidebar = () => {
  const [todayRoutes, setTodayRoutes] = useState(0)
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }),
    []
  )

  useEffect(() => {
    const fetchData = async () => {
      try {
        const routes = await window.api.planning.getRoutes(new Date().toISOString().split('T')[0])
        setTodayRoutes(routes?.length || 0)
      } catch (err) {
        console.error('Error loading sidebar data:', err)
      }
    }

    fetchData()
    window.addEventListener('settings-updated', fetchData)
    return () => window.removeEventListener('settings-updated', fetchData)
  }, [])

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white">
            <Heart size={21} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-base font-black leading-none">BAMX Planner</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">Rutas y entregas</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 px-4 py-4">
        <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs font-semibold text-slate-500">{todayLabel}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{todayRoutes}</p>
          <p className="text-xs font-medium text-slate-500">
            {todayRoutes === 1 ? 'ruta para hoy' : 'rutas para hoy'}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        <div className="space-y-1" aria-label="Flujo principal">
          {primaryNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        <div aria-label="Datos de operación">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Datos de operación
          </p>
          <div className="space-y-1">
            {catalogNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <NavItem to="/configuracion" icon={Settings} label="Ajustes" />
      </div>
    </aside>
  )
}
