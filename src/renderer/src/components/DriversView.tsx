import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, Users, ShieldCheck } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

interface Driver {
  id: number
  name: string
  photo_url?: string
  license_data?: string
  license_photo?: string
  available_days: string
  max_hours_per_day: number
}

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

  const handleLicensePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, license_photo: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, photo_url: reader.result as string })
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
      {/* Seccion de encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50/50 blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-violet-50 px-3 py-1 rounded-full mb-3 border border-violet-100">
            <Users size={14} className="text-violet-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-700">
              Capital Humano
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Choferes</h1>
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
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-slate-200 flex items-center justify-center group active:scale-95 shrink-0"
        >
          <Plus
            size={20}
            className="mr-2 group-hover:rotate-90 transition-transform duration-300"
          />
          Nuevo Chofer
        </button>
      </div>

      {/* Seccion de lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-12 h-12 border-4 border-violet-600/20 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Cargando Personal...
            </p>
          </div>
        ) : (
          drivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-premium hover:shadow-premium-hover transition-all duration-500 group relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-5">
                  <div className="w-16 h-16 rounded-[1.25rem] bg-violet-50 text-violet-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform relative">
                    {driver.photo_url ? (
                      <img src={driver.photo_url} alt={driver.name} className="w-full h-full object-cover rounded-[1.25rem]" />
                    ) : (
                      <Users size={28} />
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                      <ShieldCheck size={10} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                      {driver.name}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Chofer Certificado
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
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
                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                  >
                    <Edit2 size={16} />
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
                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Disponibilidad
                  </p>
                  <p className="text-xs font-bold text-slate-700 line-clamp-1">
                    {driver.available_days}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Carga Diaria
                  </p>
                  <p className="text-xs font-bold text-slate-700">
                    {driver.max_hours_per_day} Horas Máx.
                  </p>
                </div>
              </div>
              {driver.license_data && (
                <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Licencia Especial</span>
                  <span className="text-xs font-black text-indigo-700 uppercase">{driver.license_data}</span>
                </div>
              )}
              {driver.license_photo && (
                <div className="mt-2 text-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Copia de Licencia</p>
                  <img src={driver.license_photo} alt="Licencia" className="w-full h-24 object-cover rounded-xl border border-indigo-100" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      </div>

      {/* Ventana modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl border border-white/20 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-100 relative">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                {editingDriver ? 'Editar' : 'Nuevo'} <span className="text-violet-600">Chofer</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-10 right-10 text-slate-300 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-full"
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
                        onChange={handleImageUpload} 
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
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Núm. o Tipo de Licencia
                  </label>
                  <input
                    type="text"
                    value={formData.license_data}
                    onChange={(e) => setFormData({ ...formData, license_data: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 transition-all outline-none font-bold text-slate-900"
                    placeholder="Ej. Tipo C / 123456789"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Foto de Licencia
                  </label>
                  <div className="w-full h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-violet-400 transition-colors">
                    {formData.license_photo ? (
                      <img src={formData.license_photo} alt="Licencia Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-slate-400">
                        <Plus size={24} className="mx-auto mb-1" />
                        <span className="text-[10px] font-bold uppercase">Subir Foto de Licencia</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLicensePhotoUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
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
                  className="flex-[2] bg-violet-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-violet-500/25 hover:bg-violet-700 transition-all active:scale-[0.98]"
                >
                  {editingDriver ? 'Guardar Cambios' : 'Confirmar Chofer'}
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
