import { useEffect, useState } from 'react'
import { ChevronRight, BarChart3, MapIcon, Users, ArrowUpRight, History as HistoryIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SavedMonth {
  monthId: string;
  year: string;
  month: string;
}

const MonthlyHistoryView = () => {
  const [months, setMonths] = useState<SavedMonth[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const data = await window.api.planning.getAvailableMonths()
        setMonths(data)
      } catch (err) {
        console.error('Error fetching history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMonths()
  }, [])

  const handleNavigateToMonth = (month: string, year: string) => {
    // Navegar a la vista de planeacion con el mes/ano seleccionado
    // El mes es una cadena obtenida de strftime('%m'), por ejemplo "03"
    const monthIndex = parseInt(month, 10) - 1;
    navigate(`/planeacion?month=${monthIndex}&year=${year}`)
  }

  const getMonthName = (monthStr: string) => {
    const date = new Date(2000, parseInt(monthStr) - 1, 1)
    return date.toLocaleString('es-MX', { month: 'long' })
  }

  if (loading) {
    return (
      <div className="p-20 text-center">
        <div className="w-12 h-12 border-4 border-slate-600/20 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Consultando Archivos...</p>
      </div>
    )
  }

  return (
    <div className="w-full mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="inline-flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full mb-4 border border-indigo-100">
            <HistoryIcon size={14} className="text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Historial Logístico</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">Consultas Históricas</h1>
          <p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">
            Explora los ciclos de planeación previos, revisa la eficiencia operativa y recupera registros de servicios pasados.
          </p>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Ciclos</p>
                <p className="text-3xl font-black text-slate-900">{months.length}</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                <BarChart3 size={24}/>
            </div>
        </div>
      </div>

      {months.length === 0 ? (
        <div className="bg-white rounded-[4rem] border-2 border-dashed border-slate-200 p-24 text-center">
             <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-center mx-auto mb-8">
                <HistoryIcon size={48} className="text-slate-200" />
             </div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sin Historial Disponible</h3>
             <p className="text-slate-400 mt-2 font-medium">Aún no has guardado ninguna planeación mensual estratégica.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {months.map((m) => (
            <div 
              key={m.monthId}
              onClick={() => handleNavigateToMonth(m.month, m.year)}
              className="group bg-white p-8 rounded-[3rem] border border-slate-200 shadow-premium hover:shadow-2xl hover:border-indigo-200 transition-all duration-500 cursor-pointer relative overflow-hidden"
            >
              {/* Elementos decorativos */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-100/50 transition-colors" />
              
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex flex-col items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                    <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">{m.year}</span>
                    <span className="text-2xl font-black tracking-tighter leading-none">{m.month}</span>
                </div>
                <div className="p-3 bg-white text-slate-300 rounded-xl group-hover:text-indigo-600 transition-colors">
                    <ArrowUpRight size={20} />
                </div>
              </div>

              <div className="relative z-10">
                <h3 className="text-3xl font-black text-slate-900 capitalize tracking-tighter group-hover:text-indigo-950 transition-colors">
                    {getMonthName(m.month)}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ciclo Operativo {m.year}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50 relative z-10">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <MapIcon size={14}/>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Impacto</p>
                        <p className="text-xs font-black text-slate-900">Programado</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Users size={14}/>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Estado</p>
                        <p className="text-xs font-black text-emerald-600">Almacenado</p>
                    </div>
                 </div>
              </div>
              
              <div className="mt-8 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <span className="text-[10px] font-black text-indigo-600 flex items-center gap-2 uppercase tracking-widest">
                    Ver Detalles Completos <ChevronRight size={14}/>
                  </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Informacion de pie de pagina */}
      <div className="p-8 bg-slate-900 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/20 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          <div className="flex items-center gap-6 relative z-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm">
                  <HistoryIcon className="text-orange-400" size={24}/>
              </div>
              <div>
                  <h4 className="text-xl font-black tracking-tight">Archivo Maestro de Planeación</h4>
                  <p className="text-slate-400 text-sm font-medium">Los datos se almacenan de forma segura para cumplimiento normativo.</p>
              </div>
          </div>
          <button className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-100 transition-all active:scale-95 relative z-10">
             Descargar Reporte Global
          </button>
      </div>
    </div>
  )
}

export default MonthlyHistoryView
