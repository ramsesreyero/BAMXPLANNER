import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, Activity, Package, MapPin, Download } from 'lucide-react'

// Logica de analitica historica de prueba basada en estadisticas de datos existentes
const AnalyticsView = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalRoutes: 0,
    fuelSaved: 0
  })

  // Datos de tendencia simulados basados en comportamiento logistico realista
  const weeklyData = [
    { name: 'Lun', kilos: 4000, combustible: 240 },
    { name: 'Mar', kilos: 3000, combustible: 198 },
    { name: 'Mié', kilos: 2000, combustible: 140 },
    { name: 'Jue', kilos: 2780, combustible: 190 },
    { name: 'Vie', kilos: 1890, combustible: 120 },
    { name: 'Sáb', kilos: 2390, combustible: 180 },
  ]

  const categoryData = [
    { name: 'Urbana', value: 400, color: '#f97316' },  // naranja-500
    { name: 'Rural', value: 300, color: '#f59e0b' },   // ambar-500
    { name: 'Instituciones', value: 300, color: '#6366f1' }, // indigo-500
    { name: 'Súper', value: 200, color: '#4f46e5' },     // indigo-600
  ]

  useEffect(() => {
    // En un escenario real, esto agrega todos los datos locales de la base de datos
    const fetchAnalytics = async () => {
      try {
        const [c, i, s, r] = await Promise.all([
          window.api.db.list('colonies'),
          window.api.db.list('institutions'),
          window.api.db.list('supermarkets'),
          window.api.db.list('routes')
        ])
        setStats({
          totalPoints: c.length + i.length + s.length,
          totalRoutes: r.length || 15,
          fuelSaved: 34.5 // simulated %
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl">
          <p className="text-white font-black mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300 text-xs uppercase tracking-wider">{entry.name}:</span>
              <span className="text-white font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
      {/* Elementos visuales de fondo */}
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-orange-600/10 blur-[150px] -mr-40 -mt-40 pointer-events-none rounded-full" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] -ml-40 -mb-40 pointer-events-none rounded-full" />

      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 relative z-10">
        <div>
          <div className="inline-flex items-center space-x-2 bg-slate-900/5 dark:bg-white/5 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 shadow-sm mb-4">
            <Activity size={12} className="text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
              Datos Operativos Avanzados
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white drop-shadow-sm">
            Inteligencia <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Analítica</span>
          </h1>
        </div>
        <button className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700 active:scale-95 group">
          <Download size={18} className="text-orange-500 group-hover:-translate-y-1 transition-transform" />
          Exportar Reporte
        </button>
      </div>

      {/* Arreglo de tarjetas superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        {/* Tarjeta 1 */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-700" />
          <MapPin className="text-orange-500 mb-6" size={32} />
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Puntos Cubiertos</p>
            <p className="text-5xl font-black text-slate-800 dark:text-white mt-1">{loading ? '...' : stats.totalPoints}</p>
          </div>
        </div>
        {/* Tarjeta 2 */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700" />
          <Package className="text-indigo-500 mb-6" size={32} />
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Volumen Estimado (KG)</p>
            <p className="text-5xl font-black text-slate-800 dark:text-white mt-1">16,450</p>
          </div>
        </div>
        {/* Tarjeta 3 */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-8 rounded-[2.5rem] shadow-[0_10px_30px_rgba(249,115,22,0.3)] flex flex-col justify-between text-white overflow-hidden relative group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/micro-carbon.png')] opacity-20 mix-blend-overlay pointer-events-none" />
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700" />
          <TrendingUp className="text-white/80 mb-6 relative z-10" size={32} />
          <div className="relative z-10">
            <p className="text-[11px] font-black text-orange-200 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Optimización (Ahorro)
            </p>
            <p className="text-5xl font-black text-white mt-1">{loading ? '...' : stats.fuelSaved}%</p>
          </div>
        </div>
      </div>

      {/* Cuadricula principal de graficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative z-10">
        
        {/* Grafico de area grande: kilos recuperados */}
        <div className="xl:col-span-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/60 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)] h-[500px] flex flex-col">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Kilos Rescatados</h3>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Tendencia de los últimos 6 días</p>
          </div>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKilos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" opacity={0.2} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="kilos" name="Kilos Recolectados" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorKilos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafico de pastel de categorias */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/60 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)] h-[500px] flex flex-col">
          <div className="mb-4">
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Origen Logístico</h3>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Volumen por sector</p>
          </div>
          <div className="flex-1 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Superposicion de texto central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-800 dark:text-white mt-4">100%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trazado</span>
            </div>
          </div>
          
          {/* Elementos de la leyenda */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grafico de barras doble: seguimiento de combustible */}
        <div className="xl:col-span-3 bg-white/80 dark:bg-slate-900/60 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/60 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)] h-[400px] flex flex-col">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Consumo vs Estimación</h3>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Combustible utilizado en litros</p>
            </div>
            <div className="text-right">
               <span className="text-xs font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">Ahorro Activo</span>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                <Bar dataKey="combustible" name="Litros Consumidos" fill="#6366f1" radius={[8, 8, 8, 8]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AnalyticsView
