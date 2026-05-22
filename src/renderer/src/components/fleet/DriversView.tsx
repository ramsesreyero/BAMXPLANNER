import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, Users, ShieldCheck } from 'lucide-react'
import ConfirmModal from '../ConfirmModal'
import { Driver } from '../../types'

const DriversView = () => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: async (): Promise<void> => { }
  })

  const [formData, setFormData] = useState({
    name: '',
    photo_url: '',
    license_data: '',
    license_photo: '',
    available_days: 'Lunes,Martes,Miércoles,Jueves,Viernes',
    max_hours_per_day: 8
  })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo_url' | 'license_photo') => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const loadDrivers = async () => {
    try {
      const data = await window.api.db.list('drivers')
      setDrivers(data as Driver[])
    } catch (error) {
      console.error('Error loading drivers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDrivers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingDriver) await window.api.db.update('drivers', editingDriver.id, formData)
      else await window.api.db.create('drivers', formData)
      setIsModalOpen(false)
      setEditingDriver(null)
      setFormData({
        name: '',
        photo_url: '',
        license_data: '',
        license_photo: '',
        available_days: 'Lunes,Martes,Miércoles,Jueves,Viernes',
        max_hours_per_day: 8
      })
      loadDrivers()
    } catch (error) {
      console.error('Error saving driver:', error)
    }
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/60 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1.5'/%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-orange-200/40 via-orange-100/10 to-transparent blur-[80px] -mr-48 -mt-48 pointer-events-none group-hover:rotate-12 transition-transform duration-1000 rounded-full" />
        <div className="relative z-10 w-full overflow-hidden">
          <div className="inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-1.5 rounded-full mb-4 shadow-lg shadow-slate-900/20">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_10px_rgb(251,191,36)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100">
              Capital Humano
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter truncate">
            Gestión de <span className="text-orange-600">Choferes</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Administra el personal operativo, sus horarios y límites de jornada laboral.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDriver(null)
            setFormData({
              name: '',
              photo_url: '',
              license_data: '',
              license_photo: '',
              available_days: 'Lunes,Martes,Miércoles,Jueves,Viernes',
              max_hours_per_day: 8
            })
            setIsModalOpen(true)
          }}
          className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 text-white px-8 py-4 rounded-2xl font-black shadow-[0_10px_30px_rgba(15,23,42,0.3)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.4)] hover:to-slate-800 transition-all duration-300 active:scale-95 flex items-center space-x-2 group/btn relative overflow-hidden shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          <Plus size={20} className="relative z-10 mr-1 group-hover/btn:-rotate-90 transition-transform duration-500" />
          <span className="relative z-10">Nuevo Chofer</span>
        </button>
      </div>

      {/* List Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full bg-white/60 backdrop-blur-xl rounded-[3rem] p-24 text-center border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
             <div className="w-16 h-16 border-4 border-violet-600/20 border-t-violet-600 rounded-full animate-spin mx-auto mb-6" />
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Cargando Personal...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="col-span-full bg-white/60 backdrop-blur-xl rounded-[3rem] p-24 text-center border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-24 h-24 bg-white rounded-full shadow-inner flex items-center justify-center mx-auto mb-6">
              <Users size={40} className="text-slate-300" />
            </div>
            <p className="text-slate-800 font-black text-2xl tracking-tight">Sin personal registrado</p>
          </div>
        ) : (
          drivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg p-8 rounded-[2.5rem] border border-white dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] hover:border-violet-100 dark:hover:border-violet-500/30 transition-all duration-100 dark:duration-500 group flex flex-col relative overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-violet-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center space-x-5">
                  <div className="w-16 h-16 rounded-[1.25rem] bg-violet-50 text-violet-600 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 relative ring-[6px] ring-white">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none rounded-[1.25rem]" />
                    {driver.photo_url ? (
                      <img src={driver.photo_url} alt={driver.name} className="w-full h-full object-cover rounded-[1.25rem]" />
                    ) : (
                      <Users size={28} className="relative z-10" />
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-white flex items-center justify-center shadow-md">
                      <ShieldCheck size={10} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none shrink-0">
                      {driver.name}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                      Chofer Certificado
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingDriver(driver)
                      setFormData({
                        name: driver.name,
                        photo_url: driver.photo_url || '',
                        license_data: driver.license_data || '',
                        license_photo: driver.license_photo || '',
                        available_days: driver.available_days,
                        max_hours_per_day: driver.max_hours_per_day
                      })
                      setIsModalOpen(true)
                    }}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 hover:shadow-inner rounded-xl transition-all"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setConfirmAction({
                      isOpen: true,
                      title: 'Eliminar Chofer',
                      message: '¿Estás seguro de eliminar a este chofer permanentemente?',
                      action: async () => {
                        await window.api.db.delete('drivers', driver.id)
                        loadDrivers()
                      }
                    })}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-inner rounded-xl transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 relative z-10 border-t border-slate-100 pt-6">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Disponibilidad
                  </p>
                  <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed h-[36px]">
                    {driver.available_days.replace(/,\s*/g, ' • ')}
                  </p>
                </div>
                <div className="flex flex-col border-l border-slate-100 pl-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    Carga Diaria
                  </p>
                  <div className="flex items-end space-x-1">
                    <span className="text-3xl font-black text-slate-800 leading-none">
                      {driver.max_hours_per_day}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Hrs Max</span>
                  </div>
                </div>
              </div>
              {driver.license_data && (
                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between relative z-10">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Licencia Especial</span>
                  <div className="flex items-center gap-3">
                    {driver.license_photo && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                        <img src={driver.license_photo} alt="License" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="text-[9px] font-black text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg uppercase tracking-[0.2em]">{driver.license_data}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/20 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-100 relative bg-slate-50/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter relative z-10">
                {editingDriver ? 'Perfil Operativo de' : 'Nuevo'} <span className="text-violet-600">Chofer</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-10 right-10 text-slate-300 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-full relative z-10"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-4">
                <div className="space-y-4 flex items-center space-x-6">
                  <div className="shrink-0">
                    <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-violet-400 transition-colors">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Plus size={20} className="text-slate-400 mx-auto" />
                          <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 block">Foto</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'photo_url')} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Nombre Completo
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-violet-500/50 focus:ring-[4px] focus:ring-violet-500/10 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Tipo de Licencia
                    </label>
                    <input
                      type="text"
                      value={formData.license_data}
                      onChange={(e) => setFormData({ ...formData, license_data: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-violet-500/50 focus:ring-[4px] focus:ring-violet-500/10 transition-all outline-none font-bold text-slate-900"
                      placeholder="Ej. Tipo C"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Foto de Licencia
                    </label>
                    <div className="relative group/license h-[58px]">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'license_photo')} 
                        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer" 
                      />
                      <div className={`w-full h-full rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-2 overflow-hidden ${
                        formData.license_photo 
                        ? 'border-emerald-300 bg-emerald-50' 
                        : 'border-slate-200 hover:border-violet-300 bg-slate-50'
                      }`}>
                        {formData.license_photo ? (
                          <>
                            <img src={formData.license_photo} alt="License" className="w-8 h-8 object-cover rounded-md" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Cambiar Foto</span>
                          </>
                        ) : (
                          <>
                            <Plus size={16} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase">Subir Foto</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Días Disponibles
                  </label>
                  <input
                    type="text"
                    value={formData.available_days}
                    onChange={(e) => setFormData({ ...formData, available_days: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 transition-all outline-none font-bold text-slate-900"
                    placeholder="Ej. Lunes, Martes..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Jornada Laboral (Hrs)
                  </label>
                  <input
                    type="number"
                    value={formData.max_hours_per_day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_hours_per_day: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
              </div>
              <div className="pt-8 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-b from-violet-500 to-violet-600 border border-violet-400 text-white py-4 rounded-2xl font-black shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.4)] transition-all active:scale-[0.98] relative overflow-hidden group/submit"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                  <span className="relative z-10">{editingDriver ? 'Guardar Cambios' : 'Registrar Chofer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      <ConfirmModal
        isOpen={confirmAction.isOpen}
        title={confirmAction.title}
        message={confirmAction.message}
        onConfirm={confirmAction.action}
        onCancel={() => setConfirmAction({ ...confirmAction, isOpen: false })}
      />
    </>
  )
}

export default DriversView
