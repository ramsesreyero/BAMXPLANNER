import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  MapPin,
  Route,
  Truck,
  Users
} from 'lucide-react'
import { Link } from 'react-router-dom'

type DashboardStats = {
  colonies: any[]
  institutions: any[]
  supermarkets: any[]
  beneficiaries: any[]
  trucks: any[]
  drivers: any[]
  todayRoutes: any[]
  allRoutes: any[]
}

type MissingLocationItem = {
  id: number
  name: string
  type: 'Colonia' | 'Institución' | 'Supermercado' | 'Caridad'
}

const emptyStats: DashboardStats = {
  colonies: [],
  institutions: [],
  supermarkets: [],
  beneficiaries: [],
  trucks: [],
  drivers: [],
  todayRoutes: [],
  allRoutes: []
}

const StatTile = ({
  label,
  value,
  icon: Icon,
  tone = 'slate'
}: {
  label: string
  value: string | number
  icon: React.ElementType
  tone?: 'slate' | 'orange' | 'emerald' | 'red'
}) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    orange: 'bg-orange-50 text-orange-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700'
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

const DashboardView = () => {
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('Operación')
  const [lastBackupAt, setLastBackupAt] = useState('')
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [colonies, institutions, supermarkets, trucks, drivers, beneficiaries, todayRoutes, allRoutes, user, backup] =
          await Promise.all([
            window.api.db.list('colonies'),
            window.api.db.list('institutions'),
            window.api.db.list('supermarkets'),
            window.api.db.list('trucks'),
            window.api.db.list('drivers'),
            window.api.db.list('beneficiaries'),
            window.api.planning.getRoutes(today),
            window.api.db.list('routes'),
            window.api.settings.get('user_name'),
            window.api.settings.get('last_backup_at')
          ])

        setStats({
          colonies,
          institutions,
          supermarkets,
          beneficiaries,
          trucks,
          drivers,
          todayRoutes: todayRoutes || [],
          allRoutes
        })
        setUserName(user?.value || 'Operación')
        setLastBackupAt(backup?.value || '')
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    window.addEventListener('settings-updated', fetchStats)
    return () => window.removeEventListener('settings-updated', fetchStats)
  }, [today])

  const missingLocationItems = useMemo<MissingLocationItem[]>(() => {
    const hasCoordinates = (item: any) =>
      item.lat !== null &&
      item.lat !== undefined &&
      item.lat !== '' &&
      item.lng !== null &&
      item.lng !== undefined &&
      item.lng !== ''

    const allStops = [
      ...stats.colonies.map((item) => ({ ...item, type: 'Colonia' })),
      ...stats.institutions.map((item) => ({ ...item, type: 'Institución' })),
      ...stats.supermarkets.map((item) => ({ ...item, type: 'Supermercado' })),
      ...stats.beneficiaries.map((item) => ({ ...item, type: 'Caridad' }))
    ]

    return allStops.filter((item) => !hasCoordinates(item))
  }, [stats])

  const missingByType = useMemo(() => {
    return missingLocationItems.reduce<Record<MissingLocationItem['type'], number>>(
      (acc, item) => {
        acc[item.type] += 1
        return acc
      },
      { Colonia: 0, Institución: 0, Supermercado: 0, Caridad: 0 }
    )
  }, [missingLocationItems])

  const inactiveResources = useMemo(() => {
    const inactiveTrucks = stats.trucks.filter((truck) => truck.is_available === 0).length
    const inactiveDrivers = stats.drivers.filter((driver) => driver.is_available === 0).length
    return inactiveTrucks + inactiveDrivers
  }, [stats])

  const activeTrucks = stats.trucks.filter((truck) => truck.is_available !== 0).length
  const activeDrivers = stats.drivers.filter((driver) => driver.is_available !== 0).length
  const hasMinimumCatalogs =
    stats.colonies.length + stats.institutions.length + stats.supermarkets.length + stats.beneficiaries.length > 0
  const canPlan = hasMinimumCatalogs && activeTrucks > 0 && activeDrivers > 0 && missingLocationItems.length === 0
  const backupLabel = lastBackupAt
    ? new Date(lastBackupAt).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Sin respaldo registrado'

  const nextRoute = stats.allRoutes
    .filter((route) => route.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-orange-700">Buenos días, {userName}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Panel de operación
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Revisa lo importante, genera rutas y deja listo lo que se enviará a los conductores.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/planeacion"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-700"
            >
              Generar planeación
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/configuracion"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Respaldar datos
              <Database size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Rutas de hoy"
          value={loading ? '...' : stats.todayRoutes.length}
          icon={Route}
          tone={stats.todayRoutes.length > 0 ? 'emerald' : 'slate'}
        />
        <StatTile
          label="Puntos registrados"
          value={
            loading
              ? '...'
              : stats.colonies.length +
                stats.institutions.length +
                stats.supermarkets.length +
                stats.beneficiaries.length
          }
          icon={MapPin}
          tone="orange"
        />
        <StatTile
          label="Unidades disponibles"
          value={loading ? '...' : stats.trucks.filter((truck) => truck.is_available !== 0).length}
          icon={Truck}
        />
        <StatTile
          label="Choferes disponibles"
          value={loading ? '...' : stats.drivers.filter((driver) => driver.is_available !== 0).length}
          icon={Users}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Trabajo pendiente</h2>
              <p className="mt-1 text-sm text-slate-500">
                Lo que conviene resolver antes de generar o enviar rutas.
              </p>
            </div>
            <ClipboardList className="text-slate-300" size={24} />
          </div>

          <div className="mt-5 space-y-3">
            <Link
              to="/planeacion"
              className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-950">Preparar planeación mensual</p>
                  <p className="text-sm text-slate-500">
                    Genera, revisa y guarda las rutas del periodo.
                  </p>
                </div>
              </div>
              <ArrowRight className="text-slate-300" size={20} />
            </Link>

            <Link
              to="/colonias"
              className={`flex items-center justify-between rounded-lg border p-4 ${
                missingLocationItems.length > 0
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    missingLocationItems.length > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {missingLocationItems.length > 0 ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <CheckCircle2 size={20} />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-950">
                    {missingLocationItems.length > 0
                      ? `${missingLocationItems.length} puntos sin ubicación`
                      : 'Ubicaciones listas'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Las coordenadas ayudan a calcular rutas más confiables.
                  </p>
                </div>
              </div>
              <ArrowRight className="text-slate-300" size={20} />
            </Link>

            {missingLocationItems.length > 0 && (
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 sm:grid-cols-2">
                {[
                  { label: 'Colonias', count: missingByType.Colonia, to: '/colonias' },
                  { label: 'Instituciones', count: missingByType.Institución, to: '/instituciones' },
                  { label: 'Supermercados', count: missingByType.Supermercado, to: '/supermercados' },
                  { label: 'Caridad', count: missingByType.Caridad, to: '/caridad' }
                ]
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2 text-sm font-bold text-amber-900 hover:bg-white"
                    >
                      <span>{item.label}</span>
                      <span>{item.count}</span>
                    </Link>
                  ))}
              </div>
            )}

            <Link
              to="/unidades"
              className={`flex items-center justify-between rounded-lg border p-4 ${
                inactiveResources > 0 ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Truck size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-950">Flota y choferes</p>
                  <p className="text-sm text-slate-500">
                    {inactiveResources > 0
                      ? `${inactiveResources} recursos marcados como no disponibles.`
                      : 'Recursos listos para asignarse.'}
                  </p>
                </div>
              </div>
              <ArrowRight className="text-slate-300" size={20} />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black text-slate-950">Estado para planear</h2>
          <div
            className={`mt-4 rounded-lg border p-4 ${
              canPlan ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {canPlan ? (
                <CheckCircle2 className="mt-0.5 text-emerald-700" size={20} />
              ) : (
                <AlertTriangle className="mt-0.5 text-amber-700" size={20} />
              )}
              <div>
                <p className={`text-sm font-black ${canPlan ? 'text-emerald-950' : 'text-amber-950'}`}>
                  {canPlan ? 'Datos listos' : 'Revisión recomendada'}
                </p>
                <p className={`mt-1 text-xs font-medium ${canPlan ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {canPlan
                    ? 'Puedes generar la planeación mensual con datos completos.'
                    : 'Completa ubicaciones, unidades y choferes antes de generar rutas.'}
                </p>
              </div>
            </div>
          </div>

          <h2 className="mt-6 text-lg font-black text-slate-950">Siguiente ruta</h2>
          {nextRoute ? (
            <div className="mt-5 rounded-lg bg-slate-950 p-5 text-white">
              <p className="text-sm font-semibold text-orange-300">{nextRoute.date}</p>
              <p className="mt-2 text-2xl font-black">{nextRoute.type || 'Entrega'}</p>
              <p className="mt-1 text-sm text-slate-400">{nextRoute.status || 'Pendiente'}</p>
              <Link
                to={`/planeacion?month=${new Date(nextRoute.date + 'T12:00:00').getMonth()}&year=${new Date(nextRoute.date + 'T12:00:00').getFullYear()}`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950"
              >
                Ver planeación
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <CalendarDays className="mx-auto text-slate-300" size={36} />
              <p className="mt-3 text-sm font-semibold text-slate-600">No hay rutas futuras guardadas.</p>
            </div>
          )}

          <Link to="/configuracion" className="mt-4 block rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <Download className="text-slate-400" size={20} />
              <div>
                <p className="text-sm font-bold text-slate-950">Respaldo recomendado</p>
                <p className="text-xs text-slate-500">
                  Último respaldo: {backupLabel}.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}

export default DashboardView
