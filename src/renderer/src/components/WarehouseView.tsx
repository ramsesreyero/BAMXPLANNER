import { useEffect, useState } from 'react'
import { MapPin, Clock, Settings, ShieldCheck } from 'lucide-react'

const WarehouseView = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    address: '',
    coordinates: '',
    opening_time: '08:00',
    closing_time: '18:00',
    avg_unloading_time: 30
  })

  const loadSettings = async () => {
    try {
      const data = await window.api.db.list('warehouse')
      if (data.length > 0) {
        setFormData(data[0] as any)
      }
    } catch (error) {
      console.error('Error loading warehouse settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const existing = await window.api.db.list('warehouse')
      if (existing.length > 0) {
        await window.api.db.update('warehouse', 1, formData)
      } else {
        await window.api.db.create('warehouse', { ...formData, id: 1 })
      }
      alert('Configuración maestra actualizada.')
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="p-20 text-center">
        <div className="w-12 h-12 border-4 border-slate-600/20 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          Cargando Parámetros...
        </p>
      </div>
    )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full mx-auto">
      {/* Seccion de encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50 blur-3xl -mr-40 -mt-40 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full mb-4 border border-slate-200">
            <Settings size={14} className="text-slate-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
              Configuración de Origen
            </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            Parámetros del Almacén
          </h1>
          <p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">
            Configura los límites operativos y la ubicación central que rigen el algoritmo de
            optimización de rutas.
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center w-24 h-24 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
          <ShieldCheck size={40} className="text-slate-400" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Seleccion de ubicacion */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-premium hover:shadow-premium-hover transition-all duration-500 group">
            <div className="flex items-center space-x-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
                <MapPin size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                Centro de Operaciones
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Dirección Física
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                  placeholder="Calle, Número, Colonia, CP"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Geolocalización (Lat, Lng)
                </label>
                <input
                  type="text"
                  value={formData.coordinates}
                  onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                  placeholder="27.489, -99.508"
                />
              </div>
            </div>
          </div>

          {/* Limites operativos */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-premium hover:shadow-premium-hover transition-all duration-500 group">
            <div className="flex items-center space-x-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
                <Clock size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                Tiempos Operativos
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Hora de Apertura
                </label>
                <input
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Hora de Cierre
                </label>
                <input
                  type="time"
                  value={formData.closing_time}
                  onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-900"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Descarga Estándar (min)
                </label>
                <input
                  type="number"
                  value={formData.avg_unloading_time}
                  onChange={(e) =>
                    setFormData({ ...formData, avg_unloading_time: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-900"
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter ml-1">
                  Tiempo de retorno al CEDIS
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <button
            type="submit"
            disabled={saving}
            className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center space-x-3 text-lg group disabled:opacity-50"
          >
            <div
              className={`w-2 h-2 rounded-full bg-emerald-500 ${saving ? 'animate-pulse' : 'group-hover:animate-ping'}`}
            />
            <span>{saving ? 'Procesando...' : 'Aplicar Configuración Maestro'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default WarehouseView
