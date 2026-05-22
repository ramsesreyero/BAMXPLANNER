import { useEffect, useState } from 'react'
import {
  Users,
  MapPin,
  Building2,
  ShoppingCart,
  Truck,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Settings
} from 'lucide-react'
import { Link } from 'react-router-dom'

const StatCard = ({ title, value, icon: Icon, color, trend, delay }: any) => (
  <div
    className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-premium hover:shadow-premium-hover transition-all duration-500 group animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline space-x-2">
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
          {trend && (
            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md flex items-center">
              <TrendingUp size={10} className="mr-0.5" />
              {trend}
            </span>
          )}
        </div>
      </div>
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${color} shadow-inner`}
      >
        <Icon size={28} />
      </div>
    </div>
  </div>
)

const DashboardView = () => {
  const [stats, setStats] = useState({
    colonies: 0,
    institutions: 0,
    supermarkets: 0,
    trucks: 0,
    drivers: 0,
    beneficiaries: 0,
    activeRoutes: 0,
    weekStats: {
      completed: 0,
      inProgress: 0,
      total: 0
    }
  })
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [c, i, s, t, d, b, r] = await Promise.all([
          window.api.db.list('colonies'),
          window.api.db.list('institutions'),
          window.api.db.list('supermarkets'),
          window.api.db.list('trucks'),
          window.api.db.list('drivers'),
          window.api.db.list('beneficiaries'),
          window.api.planning.getRoutes(new Date().toISOString().split('T')[0])
        ])
        setStats({
          colonies: c.length,
          institutions: i.length,
          supermarkets: s.length,
          trucks: t.length,
          drivers: d.length,
          beneficiaries: b.length,
          activeRoutes: r ? r.length : 0,
          weekStats: calculateWeekStats(await window.api.db.list('routes'))
        })
        const act = await window.api.planning.getRecentActivities()
        setActivities(act)
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const calculateWeekStats = (allRoutes: any[]) => {
    const today = new Date()
    const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    firstDayOfWeek.setHours(0, 0, 0, 0)

    const lastDayOfWeek = new Date(firstDayOfWeek)
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6)
    lastDayOfWeek.setHours(23, 59, 59, 999)

    const weekRoutes = allRoutes.filter(r => {
      const routeDate = new Date(r.date)
      return routeDate >= firstDayOfWeek && routeDate <= lastDayOfWeek
    })

    const total = weekRoutes.length
    const completed = weekRoutes.filter(r => r.status === 'Completada').length
    const inProgress = weekRoutes.filter(r => r.status === 'Pendiente').length

    const getPct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0)

    return {
      completed: getPct(completed),
      inProgress: getPct(inProgress),
      total: getPct(completed + inProgress)
    }
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Seccion Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-600/20 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-red-600/10 blur-[80px] -ml-32 -mb-32 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-200">
                BAMX Operativo: Sistema Listo
              </span>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                {greeting()}, <span className="text-orange-400">Christian</span>
              </h1>
              <p className="text-slate-400 font-medium text-lg leading-relaxed">
                Hoy es{' '}
                {new Date().toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
                . Tienes{' '}
                <span className="text-white font-bold underline decoration-orange-500/50 decoration-4">
                  {loading ? '...' : stats.activeRoutes} {stats.activeRoutes === 1 ? 'ruta' : 'rutas'}
                </span>{' '}
                programadas para seguimiento.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <Link
              to="/planeacion"
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg shadow-orange-500/25 flex items-center justify-center group active:scale-95"
            >
              Nueva Planeación
              <ArrowRight
                size={18}
                className="ml-2 group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Cuadricula de estadisticas rapidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Colonias"
          value={loading ? '...' : stats.colonies}
          icon={MapPin}
          color="bg-orange-50 text-orange-600"
          trend="+2"
          delay={100}
        />
        <StatCard
          title="Instituciones"
          value={loading ? '...' : stats.institutions}
          icon={Building2}
          color="bg-slate-50 text-slate-600"
          delay={200}
        />
        <StatCard
          title="Súper"
          value={loading ? '...' : stats.supermarkets}
          icon={ShoppingCart}
          color="bg-orange-50 text-orange-600"
          delay={300}
        />
        <StatCard
          title="Unidades"
          value={loading ? '...' : stats.trucks}
          icon={Truck}
          color="bg-slate-50 text-slate-600"
          delay={400}
        />
      </div>

      {/* Cuadricula de contenido multiple */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: progreso y tarjeta grande */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-premium">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Rutas de la Semana
                </h3>
                <p className="text-sm text-slate-400 font-medium">Cumplimiento operativo</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl">
                <Calendar size={20} className="text-slate-400" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  label: 'Completadas',
                  value: stats.weekStats.completed,
                  color: 'text-orange-600',
                  bg: 'bg-orange-600'
                },
                {
                  label: 'En Proceso',
                  value: stats.weekStats.inProgress,
                  color: 'text-orange-500',
                  bg: 'bg-orange-500'
                }
              ].map((item, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-end justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {item.label}
                    </span>
                    <span className={`text-2xl font-black ${item.color}`}>{item.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.bg} rounded-full transition-all duration-1000`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-orange-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group cursor-pointer active:scale-[0.99] transition-all duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] -mr-24 -mt-24 group-hover:bg-white/20 transition-all duration-500" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left">
                <h2 className="text-3xl font-black tracking-tight text-white">Optimizar Logística</h2>
                <p className="text-orange-100/80 font-medium">
                  La inteligencia de rutas sugiere 3 ajustes para reducir el consumo de combustible
                  mañana.
                </p>
                <Link
                  to="/planeacion"
                  className="bg-white text-orange-600 px-6 py-2.5 rounded-xl font-bold hover:shadow-xl transition-all inline-block"
                >
                  Ver Sugerencias
                </Link>
              </div>
              <div className="p-6 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/20 transform rotate-6 group-hover:rotate-0 transition-transform duration-500">
                <TrendingUp size={80} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: flujo de actividad */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-premium flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 blur-3xl rounded-full -mr-16 -mt-16" />
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8 flex items-center relative z-10">
            <Clock size={22} className="mr-3 text-slate-300" />
            Actividad Reciente
          </h3>
          <div className="space-y-8 flex-1 relative z-10">
            {activities.map((activity: any, idx) => {
              const Icon = 
                activity.icon === 'CheckCircle2' ? CheckCircle2 :
                activity.icon === 'Users' ? Users :
                activity.icon === 'MapPin' ? MapPin :
                activity.icon === 'Truck' ? Truck :
                activity.icon === 'Settings' ? Settings : Clock;

              return (
                <div
                  key={idx}
                  className="flex items-start space-x-4 group cursor-pointer hover:translate-x-1 transition-transform animate-in fade-in slide-in-from-right-4 fill-mode-both"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div
                    className={`mt-1 w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-sm transition-all group-hover:scale-110`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-orange-600 transition-colors uppercase tracking-tight line-clamp-2">
                      {activity.text}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                      {activity.time}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <button className="mt-10 w-full py-4 bg-slate-50 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-[0.2em] border border-slate-100 hover:bg-slate-100 transition-all active:scale-95">
            Historial Completo
          </button>
        </div>
      </div>
    </div>
  )
}

export default DashboardView
