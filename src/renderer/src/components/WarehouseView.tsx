import { useEffect, useState } from 'react'
import { MapPin, Clock, ShieldCheck } from 'lucide-react'
import { AddressAutocomplete } from './AddressAutocomplete'

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
        const w = data[0]
        setFormData({
          address: w.address || '',
          coordinates: w.coordinates || '',
          opening_time: w.opening_time || '08:00',
          closing_time: w.closing_time || '18:00',
          avg_unloading_time: w.avg_unloading_time || 30
        })
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/60 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1.5'/%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-orange-200/40 via-orange-100/10 to-transparent blur-[80px] -mr-48 -mt-48 pointer-events-none group-hover:rotate-12 transition-transform duration-1000 rounded-full" />
        <div className="relative z-10 w-full overflow-hidden">
          <div className="inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-1.5 rounded-full mb-4 shadow-lg shadow-slate-900/20">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_10px_rgb(251,146,60)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100">
              Configuración Maestra
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter truncate">
            Parámetros del <span className="text-orange-500">Almacén</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Configura los límites operativos y la ubicación central que rigen el algoritmo de optimización de rutas automáticas.
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center w-24 h-24 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
          <ShieldCheck size={40} className="text-orange-500 drop-shadow-sm" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Location Selection */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg p-10 rounded-[3rem] border border-white dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(249,115,22,0.08)] hover:border-orange-100 dark:hover:border-orange-500/30 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <div className="flex items-center space-x-5 mb-10 relative z-10">
              <div className="w-16 h-16 rounded-[1.25rem] bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 ring-[6px] ring-white">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none rounded-[1.25rem]" />
                <MapPin size={24} className="relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Centro Geográfico
              </h3>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Dirección Física
                </label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(val) => setFormData({ ...formData, address: val })}
                  onSelectPlace={(place) => {
                    setFormData({
                      ...formData,
                      address: place.address,
                      coordinates: `${place.lat}, ${place.lng}`
                    })
                  }}
                  placeholder="Calle, Número, Colonia, CP (Autocompletado)"
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
                  className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-orange-500/50 focus:ring-[4px] focus:ring-orange-500/10 transition-all outline-none font-bold text-slate-900"
                  placeholder="27.489, -99.508"
                />
              </div>
            </div>
          </div>

          {/* Operational Limits */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg p-10 rounded-[3rem] border border-white dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(249,115,22,0.08)] hover:border-orange-100 dark:hover:border-orange-500/30 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <div className="flex items-center space-x-5 mb-10 relative z-10">
              <div className="w-16 h-16 rounded-[1.25rem] bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:-rotate-6 group-hover:scale-110 transition-all duration-500 ring-[6px] ring-white">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none rounded-[1.25rem]" />
                <Clock size={24} className="relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Tiempos Operativos
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Hora de Apertura
                </label>
                <input
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-emerald-500/50 focus:ring-[4px] focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-900"
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
                  className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-emerald-500/50 focus:ring-[4px] focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-900"
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
                  className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500/50 focus:ring-[4px] focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter ml-1">
                  Tiempo de retorno al CEDIS y preparación
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 text-white px-12 py-5 rounded-[2rem] font-black shadow-[0_10px_30px_rgba(15,23,42,0.3)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.4)] hover:to-slate-800 transition-all duration-300 active:scale-95 flex items-center space-x-3 text-lg group disabled:opacity-50 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            <div
              className={`w-3 h-3 rounded-full bg-orange-500 relative z-10 shadow-[0_0_10px_rgba(249,115,22,0.8)] ${saving ? 'animate-pulse' : 'group-hover:animate-ping'}`}
            />
            <span className="relative z-10">{saving ? 'Procesando Integración...' : 'Aplicar Configuración Maestro'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default WarehouseView
