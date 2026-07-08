import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, Building2, Search, Filter, Map } from 'lucide-react'
import ConfirmModal from '../ConfirmModal'
import ItemMapModal from '../ItemMapModal'
import { Institution } from '../../types'
import { AddressAutocomplete } from '../AddressAutocomplete'

const InstitutionsView = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)
  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: async (): Promise<void> => { }
  })
  const [mapModalItem, setMapModalItem] = useState<{name: string, lat: number, lng: number, type: string} | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    fixed_day: 'Lunes-Viernes',
    estimated_kg: 0,
    delivery_time: 30,
    lat: 0,
    lng: 0
  })

  const loadInstitutions = async () => {
    try {
      const data = await window.api.db.list('institutions')
      setInstitutions(data as Institution[])
    } catch (error) {
      console.error('Error loading institutions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInstitutions()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingInstitution) {
        await window.api.db.update('institutions', editingInstitution.id, formData)
      } else {
        await window.api.db.create('institutions', formData)
      }
      setIsModalOpen(false)
      setEditingInstitution(null)
      setFormData({
        name: '',
        address: '',
        fixed_day: 'Lunes-Viernes',
        estimated_kg: 0,
        delivery_time: 30,
        lat: 0,
        lng: 0
      })
      loadInstitutions()
    } catch (error) {
      console.error('Error saving institution:', error)
    }
  }

  const handleEdit = (inst: Institution) => {
    setEditingInstitution(inst)
    setFormData({
      name: inst.name,
      address: inst.address,
      fixed_day: inst.fixed_day,
      estimated_kg: inst.estimated_kg,
      delivery_time: inst.delivery_time,
      lat: inst.lat || 0,
      lng: inst.lng || 0
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: number) => {
    setConfirmAction({
      isOpen: true,
      title: 'Eliminar Institución',
      message: '¿Estás seguro de eliminar esta institución permanentemente?',
      action: async () => {
        try {
          await window.api.db.delete('institutions', id)
          loadInstitutions()
        } catch (error) {
          console.error('Error deleting institution:', error)
        }
      }
    })
  }

  const filteredInstitutions = institutions.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              Módulo de Alianzas
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter truncate">
            Gestión de <span className="text-emerald-600">Instituciones</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Administra las instituciones con convenios de recepción y días fijos de atención.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingInstitution(null)
            setFormData({
              name: '',
              address: '',
              fixed_day: 'Lunes-Viernes',
              estimated_kg: 0,
              delivery_time: 30,
              lat: 0,
              lng: 0
            })
            setIsModalOpen(true)
          }}
          className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 text-white px-8 py-4 rounded-2xl font-black shadow-[0_10px_30px_rgba(15,23,42,0.3)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.4)] hover:to-slate-800 transition-all duration-300 active:scale-95 flex items-center space-x-2 group/btn relative overflow-hidden shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          <Plus size={20} className="relative z-10 mr-1 group-hover/btn:-rotate-90 transition-transform duration-500" />
          <span className="relative z-10">Nueva Institución</span>
        </button>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, dirección o día..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:ring-[4px] focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
        <button className="px-8 py-4 bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-600 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex items-center justify-center font-black text-sm uppercase tracking-widest shrink-0">
          <Filter size={18} className="mr-2" />
          Filtros
        </button>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-24 text-center border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
             <div className="w-16 h-16 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-6" />
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Cargando datos...</p>
          </div>
        ) : filteredInstitutions.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-24 text-center border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-24 h-24 bg-white rounded-full shadow-inner flex items-center justify-center mx-auto mb-6">
              <Search size={40} className="text-slate-300" />
            </div>
            <p className="text-slate-800 font-black text-2xl tracking-tight">Sin registros</p>
            <p className="text-slate-500 font-medium text-sm mt-2">No se encontraron instituciones.</p>
          </div>
        ) : (
          filteredInstitutions.map((inst) => (
            <div key={inst.id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg p-6 rounded-[2.5rem] border border-white dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.08)] hover:border-emerald-100 dark:hover:border-emerald-500/30 transition-all duration-500 group flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
               
               <div className="flex items-center space-x-5 relative z-10 md:w-2/5">
                 <div className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 bg-emerald-50 text-emerald-600 ring-[6px] ring-white shadow-inner relative overflow-hidden shrink-0">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
                   <Building2 size={24} className="relative z-10" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">{inst.name}</h3>
                   <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest max-w-[200px] truncate" title={inst.address}>
                     {inst.address}
                   </p>
                 </div>
               </div>

               <div className="relative z-10 md:w-1/4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Operación</p>
                 <p className="text-lg font-bold text-slate-700">{inst.fixed_day}</p>
                 <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-[0.2em] bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 mt-2 block w-max`}>
                   {inst.delivery_time} MIN DESCARGA
                 </span>
               </div>

               <div className="relative z-10 md:w-1/4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Carga Est.</p>
                 <div className="flex items-center space-x-2">
                   <span className="text-2xl font-black text-slate-800 tracking-tighter">{inst.estimated_kg}</span>
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">Kilogramos</span>
                 </div>
               </div>

               <div className="flex items-center justify-end space-x-2 relative z-10 md:w-1/6">
                  <button onClick={() => setMapModalItem({ name: inst.name, lat: inst.lat || 0, lng: inst.lng || 0, type: 'Institución' })} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-inner rounded-full transition-all bg-white border border-slate-100 hover:border-indigo-100" title="Ver en Mapa"><Map size={20} /></button>
                  <button onClick={() => handleEdit(inst)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:shadow-inner rounded-full transition-all bg-white border border-slate-100 hover:border-emerald-100" title="Editar"><Edit2 size={20} /></button>
                  <button onClick={() => handleDelete(inst.id)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-inner rounded-full transition-all bg-white border border-slate-100 hover:border-red-100" title="Eliminar"><Trash2 size={20} /></button>
               </div>
            </div>
          ))
        )}
      </div>

      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/20 dark:border-white/10 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-100 relative bg-slate-50/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter relative z-10">
                {editingInstitution ? 'Editar' : 'Nueva'}{' '}
                <span className="text-emerald-600">Institución</span>
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
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nombre de la Institución
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Dirección
                  </label>
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={(val) => setFormData({ ...formData, address: val })}
                    onSelectPlace={(place) => {
                      setFormData({
                        ...formData,
                        address: place.address,
                        lat: place.lat,
                        lng: place.lng
                      })
                    }}
                    placeholder="Dirección de la institución (Autocompletado)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Día Fijo
                    </label>
                    <input
                      type="text"
                      value={formData.fixed_day}
                      onChange={(e) => setFormData({ ...formData, fixed_day: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Kg Estimados
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_kg}
                      onChange={(e) =>
                        setFormData({ ...formData, estimated_kg: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-emerald-500/50 focus:ring-[4px] focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Tiempo de Entrega (min)
                    </label>
                    <input
                      type="number"
                      value={formData.delivery_time}
                      onChange={(e) =>
                        setFormData({ ...formData, delivery_time: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-emerald-500/50 focus:ring-[4px] focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Latitud
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-emerald-500/50 focus:ring-[4px] focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Longitud
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-emerald-500/50 focus:ring-[4px] focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
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
                  className="flex-[2] bg-gradient-to-b from-emerald-500 to-emerald-600 border border-emerald-400 text-white py-4 rounded-2xl font-black shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98] relative overflow-hidden group/submit"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                  <span className="relative z-10">{editingInstitution ? 'Guardar Cambios' : 'Registrar Institución'}</span>
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

      <ItemMapModal
        isOpen={!!mapModalItem}
        onClose={() => setMapModalItem(null)}
        item={mapModalItem}
      />
    </>
  )
}

export default InstitutionsView
