import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, ShoppingCart, Search, Filter, Map } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import ItemMapModal from './ItemMapModal'
import { LocationPicker } from './LocationPicker'

interface Supermarket {
  id: number
  name: string
  address: string
  collection_days: string
  avg_volume: number
  loading_time: number
  lat?: number
  lng?: number
  is_foreign: number
}

const SupermarketsView = () => {
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupermarket, setEditingSupermarket] = useState<Supermarket | null>(null)
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
    collection_days: 'Lunes-Sábado',
    avg_volume: 0,
    loading_time: 45,
    lat: 0,
    lng: 0,
    is_foreign: 0
  })

  const loadSupermarkets = async () => {
    try {
      const data = await window.api.db.list('supermarkets')
      setSupermarkets(data as Supermarket[])
    } catch (error) {
      console.error('Error loading supermarkets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSupermarkets()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSupermarket) {
        await window.api.db.update('supermarkets', editingSupermarket.id, formData)
      } else {
        await window.api.db.create('supermarkets', formData)
      }
      setIsModalOpen(false)
      setEditingSupermarket(null)
      setFormData({
        name: '',
        address: '',
        collection_days: 'Lunes-Sábado',
        avg_volume: 0,
        loading_time: 45,
        lat: 0,
        lng: 0,
        is_foreign: 0
      })
      loadSupermarkets()
    } catch (error) {
      console.error('Error saving supermarket:', error)
    }
  }

  const handleEdit = (market: Supermarket) => {
    setEditingSupermarket(market)
    setFormData({
      name: market.name || '',
      address: market.address || '',
      collection_days: market.collection_days || 'Lunes-Sábado',
      avg_volume: market.avg_volume || 0,
      loading_time: market.loading_time || 15,
      lat: market.lat || 0,
      lng: market.lng || 0,
      is_foreign: market.is_foreign || 0
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: number) => {
    setConfirmAction({
      isOpen: true,
      title: 'Eliminar Supermercado',
      message: '¿Estás seguro de eliminar este supermercado permanentemente?',
      action: async () => {
        try {
          await window.api.db.delete('supermarkets', id)
          loadSupermarkets()
        } catch (error) {
          console.error('Error deleting supermarket:', error)
        }
      }
    })
  }

  const filteredSupermarkets = supermarkets.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const foreignCount = supermarkets.filter(s => s.is_foreign === 1).length

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Seccion de encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50/50 blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-orange-50 px-3 py-1 rounded-full mb-3 border border-orange-100">
            <ShoppingCart size={14} className="text-orange-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-700">
              Módulo de Suministro
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Súper</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Administra los puntos de recolección de donativos en supermercados y tiendas de
            autoservicio.
          </p>
          {/* Contadores */}
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-2xl border border-orange-100">
              <span className="text-2xl font-black text-orange-600">{supermarkets.length}</span>
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-tight">Total<br/>Súpers</span>
            </div>
            {searchTerm && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-2xl font-black text-slate-700">{filteredSupermarkets.length}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Resultados<br/>Filtrados</span>
              </div>
            )}
            {foreignCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100">
                <span className="text-2xl font-black text-indigo-600">{foreignCount}</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-tight">Donativos<br/>Foráneos</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setEditingSupermarket(null)
            setFormData({
              name: '',
              address: '',
              collection_days: 'Lunes-Sábado',
              avg_volume: 0,
              loading_time: 45,
              lat: 0,
              lng: 0,
              is_foreign: 0
            })
            setIsModalOpen(true)
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-slate-200 flex items-center justify-center group active:scale-95 shrink-0"
        >
          <Plus
            size={20}
            className="mr-2 group-hover:rotate-90 transition-transform duration-300"
          />
          Nuevo Súper
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
            placeholder="Buscar por nombre, cadena o ubicación..."
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
                  Súper / Tienda
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Agenda
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Estimados
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
                        Cargando...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredSupermarkets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                        <ShoppingCart size={32} className="text-slate-200" />
                      </div>
                      <p className="text-slate-800 font-bold text-lg">Sin supermercados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSupermarkets.map((market) => (
                  <tr key={market.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                          <ShoppingCart size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase tracking-tight">
                            {market.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest max-w-[200px] truncate">
                            {market.address}
                          </p>
                          {market.is_foreign === 1 && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full border border-indigo-100 uppercase tracking-tighter">
                              Donativo Foráneo
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">{market.collection_days}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {market.loading_time} min carga
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg">
                          <span className="text-sm font-black">{market.avg_volume}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          Vol. Promedio
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setMapModalItem({ name: market.name, lat: market.lat || 0, lng: market.lng || 0, type: 'Supermercado' })}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Ver en Mapa"
                        >
                          <Map size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(market)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(market.id)}
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
                {editingSupermarket ? 'Editar' : 'Nuevo'}{' '}
                <span className="text-orange-600">Súper</span>
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nombre de la Tienda
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <LocationPicker
                  addressLabel="Dirección / ubicación"
                  addressValue={formData.address}
                  onAddressChange={(value) => setFormData({ ...formData, address: value })}
                  lat={formData.lat}
                  lng={formData.lng}
                  tone="orange"
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
                      Días de Recolección
                    </label>
                    <input
                      type="text"
                      value={formData.collection_days}
                      onChange={(e) =>
                        setFormData({ ...formData, collection_days: e.target.value })
                      }
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Vol. Promedio
                    </label>
                    <input
                      type="number"
                      value={formData.avg_volume}
                      onChange={(e) =>
                        setFormData({ ...formData, avg_volume: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Tiempo de Carga (min)
                    </label>
                    <input
                      type="number"
                      value={formData.loading_time}
                      onChange={(e) =>
                        setFormData({ ...formData, loading_time: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="is_foreign"
                    checked={formData.is_foreign === 1}
                    onChange={(e) => setFormData({ ...formData, is_foreign: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="is_foreign" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Marcar como Donativo Foráneo
                  </label>
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
                  className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-orange-500/25 hover:bg-orange-700 transition-all active:scale-[0.98]"
                >
                  {editingSupermarket ? 'Guardar Cambios' : 'Registrar Súper'}
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

export default SupermarketsView
