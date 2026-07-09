import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, Heart, Search, Filter, Map } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import ItemMapModal from './ItemMapModal'
import { LocationPicker } from './LocationPicker'

interface Beneficiary {
  id: number
  name: string
  address: string
  folio: string
  phone: string
  pb: string
  restriction_day: string
  avg_delivery_time: number
  lat?: number
  lng?: number
}

const CaridadView = () => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null)
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
    folio: '',
    phone: '',
    pb: '',
    restriction_day: 'Ninguna',
    avg_delivery_time: 15,
    lat: 0,
    lng: 0
  })

  const loadBeneficiaries = async () => {
    try {
      const data = await window.api.db.list('beneficiaries')
      setBeneficiaries(data as Beneficiary[])
    } catch (error) {
      console.error('Error loading beneficiaries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBeneficiaries()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingBeneficiary)
        await window.api.db.update('beneficiaries', editingBeneficiary.id, formData)
      else await window.api.db.create('beneficiaries', formData)
      setIsModalOpen(false)
      setEditingBeneficiary(null)
      setFormData({ 
        name: '', 
        address: '', 
        folio: '',
        phone: '',
        pb: '',
        restriction_day: 'Ninguna', 
        avg_delivery_time: 15, 
        lat: 0, 
        lng: 0 
      })
      loadBeneficiaries()
    } catch (error) {
      console.error('Error saving beneficiary:', error)
    }
  }

  const filtered = beneficiaries.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const uniquePB = new Set(beneficiaries.map(b => b.pb).filter(Boolean)).size

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Seccion de encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50/50 blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-rose-50 px-3 py-1 rounded-full mb-3 border border-rose-100">
            <Heart size={14} className="text-rose-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
              Compromiso Social
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Ruta de la Caridad</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Gestiona el padrón de beneficiarios directos y sus requerimientos específicos de
            entrega.
          </p>
          {/* Contadores */}
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-2xl border border-rose-100">
              <span className="text-2xl font-black text-rose-600">{beneficiaries.length}</span>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-tight">Total<br/>Beneficiarios</span>
            </div>
            {searchTerm && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-2xl font-black text-slate-700">{filtered.length}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Resultados<br/>Filtrados</span>
              </div>
            )}
            {uniquePB > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 rounded-2xl border border-pink-100">
                <span className="text-2xl font-black text-pink-600">{uniquePB}</span>
                <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-tight">Puestos<br/>Base (P.B.)</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setEditingBeneficiary(null)
            setFormData({
              name: '',
              address: '',
              folio: '',
              phone: '',
              pb: '',
              restriction_day: 'Ninguna',
              avg_delivery_time: 15,
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
          Nuevo Beneficiario
        </button>
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar por nombre o ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-[1.5rem] bg-white border border-slate-200/60 shadow-premium focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all text-sm font-medium"
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
                  Beneficiario
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Folio
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Ubicación
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Contacto
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                   P.B.
                </th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Operación
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
                      <div className="w-12 h-12 border-4 border-rose-600/20 border-t-rose-600 rounded-full animate-spin mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        Actualizando...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-8 py-20 text-center text-slate-400 font-bold italic"
                  >
                    No hay beneficiarios registrados
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                          <Heart size={20} fill="currentColor" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase tracking-tight">
                            {b.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                            Caso Prioritario
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg">
                          {b.folio || 'N/A'}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-700 truncate max-w-[250px]">
                        {b.address}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-900">{b.phone || '-'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Celular</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-slate-700">{b.pb || '-'}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">{b.restriction_day}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {b.avg_delivery_time} min descarga
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setMapModalItem({ name: b.name, lat: b.lat || 0, lng: b.lng || 0, type: 'Beneficiario' })}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Ver en Mapa"
                        >
                          <Map size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBeneficiary(b)
                            setFormData({
                              name: b.name,
                              address: b.address,
                              folio: b.folio || '',
                              phone: b.phone || '',
                              pb: b.pb || '',
                              restriction_day: b.restriction_day,
                              avg_delivery_time: b.avg_delivery_time,
                              lat: b.lat || 0,
                              lng: b.lng || 0
                            })
                            setIsModalOpen(true)
                          }}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setConfirmAction({
                            isOpen: true,
                            title: 'Eliminar Beneficiario',
                            message: '¿Estás seguro de eliminar este beneficiario permanentemente?',
                            action: async () => {
                              await window.api.db.delete('beneficiaries', b.id)
                              loadBeneficiaries()
                            }
                          })}
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
                {editingBeneficiary ? 'Editar' : 'Nuevo'}{' '}
                <span className="text-rose-600">Beneficiario</span>
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
                    Nombre Completo
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Folio / Referencia
                    </label>
                    <input
                      type="text"
                      value={formData.folio}
                      onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none font-bold text-slate-900"
                      placeholder="Ej. BALARE-ESN001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      P.B. (Puesto/Base)
                    </label>
                    <input
                      type="text"
                      value={formData.pb}
                      onChange={(e) => setFormData({ ...formData, pb: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none font-bold text-slate-900"
                      placeholder="Ej. P.B. 1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Teléfono / Celular
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                </div>

                <LocationPicker
                  addressLabel="Dirección de entrega"
                  addressValue={formData.address}
                  onAddressChange={(value) => setFormData({ ...formData, address: value })}
                  lat={formData.lat}
                  lng={formData.lng}
                  tone="rose"
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
                      Día Restringido
                    </label>
                    <input
                      type="text"
                      value={formData.restriction_day}
                      onChange={(e) =>
                        setFormData({ ...formData, restriction_day: e.target.value })
                      }
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                      Tiempo Descarga
                    </label>
                    <input
                      type="number"
                      value={formData.avg_delivery_time}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          avg_delivery_time: parseInt(e.target.value) || 0
                        })
                      }
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none font-bold text-slate-900"
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
                  className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-rose-500/25 hover:bg-rose-700 transition-all active:scale-[0.98]"
                >
                  {editingBeneficiary ? 'Guardar Cambios' : 'Registrar Beneficiario'}
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

export default CaridadView
