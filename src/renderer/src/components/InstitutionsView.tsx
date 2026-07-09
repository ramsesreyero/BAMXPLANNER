import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, Building2, Search, Filter, Map } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import ItemMapModal from './ItemMapModal'
import { LocationPicker } from './LocationPicker'

interface Institution {
  id: number
  name: string
  address: string
  fixed_day: string
  estimated_kg: number
  delivery_time: number
  lat?: number
  lng?: number
}

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

  const totalKg = institutions.reduce((sum, i) => sum + (i.estimated_kg || 0), 0)

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Seccion de encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 px-3 py-1 rounded-full mb-3 border border-emerald-100">
            <Building2 size={14} className="text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Módulo de Alianzas
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Gestión de Instituciones
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Administra las instituciones con convenios de recepción y días fijos de atención.
          </p>
          {/* Contadores */}
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-2xl font-black text-emerald-600">{institutions.length}</span>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-tight">Total<br/>Instituciones</span>
            </div>
            {searchTerm && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-2xl font-black text-slate-700">{filteredInstitutions.length}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Resultados<br/>Filtrados</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-2xl border border-teal-100">
              <span className="text-2xl font-black text-teal-600">{totalKg.toLocaleString()}</span>
              <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest leading-tight">Kg<br/>Estimados</span>
            </div>
          </div>
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
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-slate-200 flex items-center justify-center group active:scale-95 shrink-0"
        >
          <Plus
            size={20}
            className="mr-2 group-hover:rotate-90 transition-transform duration-300"
          />
          Nueva Institución
        </button>
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, dirección o día..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-[1.5rem] bg-white border border-slate-200/60 shadow-premium focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all text-sm font-medium"
          />
        </div>
        <button className="px-6 py-4 bg-white border border-slate-200/60 rounded-[1.5rem] shadow-premium text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center font-bold text-sm">
          <Filter size={18} className="mr-2" />
          Filtros
        </button>
      </div>

      {/* Tabla de contenido */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Institución
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Operación
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Carga
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        Actualizando...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                        <Building2 size={32} className="text-slate-200" />
                      </div>
                      <p className="text-slate-800 font-bold text-lg">Sin registros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInstitutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase tracking-tight">
                            {inst.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest max-w-[200px] truncate">
                            {inst.address}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">{inst.fixed_day}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {inst.delivery_time} min descarga
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
                          <span className="text-sm font-black">{inst.estimated_kg}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          Kg Estimados
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setMapModalItem({ name: inst.name, lat: inst.lat || 0, lng: inst.lng || 0, type: 'Institución' })}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Ver en Mapa"
                        >
                          <Map size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(inst)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(inst.id)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      </div>

      {/* Ventana modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-white/20 w-full max-w-3xl max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="p-10 border-b border-slate-100 relative">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
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
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
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
                <LocationPicker
                  addressLabel="Dirección"
                  addressValue={formData.address}
                  onAddressChange={(value) => setFormData({ ...formData, address: value })}
                  lat={formData.lat}
                  lng={formData.lng}
                  tone="emerald"
                  onLocationChange={(location) =>
                    setFormData({
                      ...formData,
                      address: location.address ?? formData.address,
                      lat: location.lat,
                      lng: location.lng
                    })
                  }
                />
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
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-900"
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
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-900"
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
                  className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-500/25 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                >
                  {editingInstitution ? 'Guardar Cambios' : 'Registrar Institución'}
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
