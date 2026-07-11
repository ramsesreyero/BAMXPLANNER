import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, MapPin, Search, Filter, Map } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import ItemMapModal from './ItemMapModal'
import { LocationPicker } from './LocationPicker'

interface Colony {
  id: number
  name: string
  type: 'Urbana' | 'Rural'
  pantry_count: number
  collection_point: string
  frequency: string
  preferred_day: string
  lat?: number
  lng?: number
  recovery_fee: number
}

const ColoniasView = () => {
  const [colonies, setColonies] = useState<Colony[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingColony, setEditingColony] = useState<Colony | null>(null)
  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: async (): Promise<void> => { }
  })
  const [mapModalItem, setMapModalItem] = useState<{name: string, lat: number, lng: number, type: string} | null>(null)

  const [formData, setFormData] = useState<Omit<Colony, 'id'>>({
    name: '',
    type: 'Urbana',
    pantry_count: 0,
    collection_point: '',
    frequency: 'Quincenal',
    preferred_day: 'Lunes',
    lat: 0,
    lng: 0,
    recovery_fee: 0
  })

  const loadColonies = async () => {
    try {
      const data = await window.api.db.list('colonies')
      setColonies(data as Colony[])
    } catch (error) {
      console.error('Error loading colonies:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadColonies()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingColony) {
        await window.api.db.update('colonies', editingColony.id, formData)
      } else {
        await window.api.db.create('colonies', formData)
      }
      setIsModalOpen(false)
      setEditingColony(null)
      setFormData({
        name: '',
        type: 'Urbana',
        pantry_count: 0,
        collection_point: '',
        frequency: 'Quincenal',
        preferred_day: 'Lunes',
        lat: 0,
        lng: 0,
        recovery_fee: 0
      })
      loadColonies()
    } catch (error) {
      console.error('Error saving colony:', error)
    }
  }

  const handleEdit = (colony: Colony) => {
    setEditingColony(colony)
    setFormData({
      name: colony.name || '',
      type: colony.type === 'Rural' ? 'Rural' : 'Urbana',
      pantry_count: colony.pantry_count || 0,
      collection_point: colony.collection_point || '',
      frequency: colony.frequency || '',
      preferred_day: colony.preferred_day || '',
      lat: colony.lat || 0,
      lng: colony.lng || 0,
      recovery_fee: colony.recovery_fee || 0
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: number) => {
    setConfirmAction({
      isOpen: true,
      title: 'Eliminar Colonia',
      message: '¿Estás seguro de eliminar esta colonia permanentemente?',
      action: async () => {
        try {
          await window.api.db.delete('colonies', id)
          loadColonies()
        } catch (error) {
          console.error('Error deleting colony:', error)
        }
      }
    })
  }

  const filteredColonies = colonies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.collection_point.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPantries = colonies.reduce((sum, c) => sum + (c.pantry_count || 0), 0)

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Seccion de encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50/50 blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-orange-50 px-3 py-1 rounded-full mb-3 border border-orange-100">
            <MapPin size={14} className="text-orange-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-700">
              Módulo de Territorio
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Colonias</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Administra los puntos de entrega y la logística quincenal para la distribución de
            despensas.
          </p>
          {/* Contadores */}
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-2xl border border-orange-100">
              <span className="text-2xl font-black text-orange-600">{colonies.length}</span>
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-tight">Total<br/>Colonias</span>
            </div>
            {searchTerm && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-2xl font-black text-slate-700">{filteredColonies.length}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Resultados<br/>Filtrados</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-2xl border border-amber-100">
              <span className="text-2xl font-black text-amber-600">{totalPantries.toLocaleString()}</span>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-tight">Total<br/>Despensas</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingColony(null)
            setFormData({
              name: '',
              type: 'Urbana',
              pantry_count: 0,
              collection_point: '',
              frequency: 'Quincenal',
              preferred_day: 'Lunes',
              lat: 0,
              lng: 0,
              recovery_fee: 0
            })
            setIsModalOpen(true)
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-slate-200 flex items-center justify-center group active:scale-95 shrink-0"
        >
          <Plus
            size={20}
            className="mr-2 group-hover:rotate-90 transition-transform duration-300"
          />
          Nueva Colonia
        </button>
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, tipo o ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-[1.5rem] bg-white border border-slate-200/60 shadow-premium focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-sm font-medium"
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
                  Info General
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Logística
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Volumen
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
                      <div className="w-12 h-12 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        Actualizando Datos...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredColonies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                        <Search size={32} className="text-slate-200" />
                      </div>
                      <p className="text-slate-800 font-bold text-lg">No hay resultados</p>
                      <p className="text-slate-400 text-sm mt-1">
                        Intenta ajustar tus criterios de búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredColonies.map((colony) => (
                  <tr key={colony.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase tracking-tight">
                            {colony.name}
                          </p>
                          <div className="flex items-center mt-1 space-x-2">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${colony.type === 'Urbana'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-emerald-50 text-emerald-600'
                                }`}
                            >
                              {colony.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]">
                              {colony.collection_point}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">{colony.preferred_day}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {colony.frequency} • ${colony.recovery_fee || 0} cuota
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="px-3 py-1 bg-slate-100 rounded-lg">
                          <span className="text-sm font-black text-slate-800">
                            {colony.pantry_count}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          Despensas
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setMapModalItem({ name: colony.name, lat: colony.lat || 0, lng: colony.lng || 0, type: 'Colonia' })}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Ver en Mapa"
                        >
                          <Map size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(colony)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(colony.id)}
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

      {/* Modal premium */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-white/20 w-full max-w-3xl max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="p-10 border-b border-slate-100 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter relative z-10">
                {editingColony ? 'Editar' : 'Registrar'}{' '}
                <span className="text-orange-600">Colonia</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                type="button"
                className="absolute top-8 right-8 z-[100] text-slate-700 hover:text-slate-950 transition-all w-10 h-10 flex items-center justify-center hover:bg-slate-200/60 active:scale-95 rounded-full font-bold text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nombre de la Colonia
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Las Torres"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tipo de Zona
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none bg-white font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="Urbana">Urbana</option>
                    <option value="Rural">Rural</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Volumen Despensas
                  </label>
                  <input
                    type="number"
                    value={formData.pantry_count}
                    onChange={(e) =>
                      setFormData({ ...formData, pantry_count: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="col-span-2">
                  <LocationPicker
                    addressLabel="Punto de entrega / referencia"
                    addressValue={formData.collection_point}
                    onAddressChange={(value) => setFormData({ ...formData, collection_point: value })}
                    lat={formData.lat}
                    lng={formData.lng}
                    tone="orange"
                    onLocationChange={(location) =>
                      setFormData({
                        ...formData,
                        collection_point: location.address ?? formData.collection_point,
                        lat: location.lat,
                        lng: location.lng
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Día de Visita
                  </label>
                  <select
                    value={formData.preferred_day}
                    onChange={(e) => setFormData({ ...formData, preferred_day: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none bg-white font-bold text-slate-900 cursor-pointer"
                  >
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Frecuencia
                  </label>
                  <input
                    type="text"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    placeholder="Ej. Quincenal"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
              </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Cuota de Recuperación ($)
                  </label>
                  <input
                    type="number"
                    value={formData.recovery_fee}
                    onChange={(e) => setFormData({ ...formData, recovery_fee: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter ml-1">
                    Monto total a recaudar en el punto de cobro
                  </p>
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
                  className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-orange-500/25 hover:bg-orange-700 transition-all active:scale-[0.98]"
                >
                  {editingColony ? 'Guardar Cambios' : 'Confirmar Registro'}
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

export default ColoniasView
