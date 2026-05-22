import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, Truck } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

interface TruckData {
  id: number
  name: string
  capacity_kg: number
  capacity_volume: number
  fuel_capacity: number
  insurance_policy: string
  insurance_name: string
  insurance_phone: string
  insurance_type: 'Cobertura amplia' | 'Daños a terceros'
  loading_nip: string
  is_refrigerated: number
  type: 'Camión' | 'Camioneta'
}

const TrucksView = () => {
  const [trucks, setTrucks] = useState<TruckData[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTruck, setEditingTruck] = useState<TruckData | null>(null)
  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: async (): Promise<void> => { }
  })

  const [formData, setFormData] = useState({
    name: '',
    capacity_kg: 0,
    capacity_volume: 0,
    fuel_capacity: 0,
    insurance_policy: '',
    insurance_name: '',
    insurance_phone: '',
    insurance_type: 'Cobertura amplia' as 'Cobertura amplia' | 'Daños a terceros',
    loading_nip: '',
    is_refrigerated: 1,
    type: 'Camión' as 'Camión' | 'Camioneta'
  })

  const loadTrucks = async () => {
    try {
      const data = await window.api.db.list('trucks')
      setTrucks(data as TruckData[])
    } catch (error) {
      console.error('Error loading trucks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrucks()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTruck) {
        await window.api.db.update('trucks', editingTruck.id, formData)
      } else {
        await window.api.db.create('trucks', formData)
      }
      setIsModalOpen(false)
      setEditingTruck(null)
      setFormData({ 
        name: '', 
        capacity_kg: 0, 
        capacity_volume: 0, 
        fuel_capacity: 0, 
        insurance_policy: '', 
        insurance_name: '',
        insurance_phone: '',
        insurance_type: 'Cobertura amplia',
        loading_nip: '',
        is_refrigerated: 1,
        type: 'Camión' 
      })
      loadTrucks()
    } catch (error) {
      console.error('Error saving truck:', error)
    }
  }

  const handleEdit = (t: TruckData) => {
    setEditingTruck(t)
    setFormData({
      name: t.name,
      capacity_kg: t.capacity_kg,
      capacity_volume: t.capacity_volume,
      fuel_capacity: t.fuel_capacity || 0,
      insurance_policy: t.insurance_policy || '',
      insurance_name: t.insurance_name || '',
      insurance_phone: t.insurance_phone || '',
      insurance_type: t.insurance_type || 'Cobertura amplia',
      loading_nip: t.loading_nip || '',
      is_refrigerated: t.is_refrigerated ?? 1,
      type: t.type as 'Camión' | 'Camioneta'
    })
    setIsModalOpen(true)
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Seccion de encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50/50 blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-full mb-3 border border-red-100">
            <Truck size={14} className="text-red-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-700">
              Módulo de Logística
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Unidades</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Administra la flota de vehículos, sus capacidades técnicas y disponibilidad operativa.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTruck(null)
            setFormData({ 
              name: '', 
              capacity_kg: 0, 
              capacity_volume: 0, 
              fuel_capacity: 0, 
              insurance_policy: '', 
              insurance_name: '',
              insurance_phone: '',
              insurance_type: 'Cobertura amplia',
              loading_nip: '',
              is_refrigerated: 1,
              type: 'Camión' 
            })
            setIsModalOpen(true)
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-slate-200 flex items-center justify-center group active:scale-95 shrink-0"
        >
          <Plus
            size={20}
            className="mr-2 group-hover:rotate-90 transition-transform duration-300"
          />
          Nueva Unidad
        </button>
      </div>

      {/* Cuadricula de contenido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Cargando Unidades...
            </p>
          </div>
        ) : trucks.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-slate-200">
            <Truck size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-bold text-lg">No hay unidades registradas</p>
          </div>
        ) : (
          trucks.map((truck) => (
            <div
              key={truck.id}
              className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-premium hover:shadow-premium-hover transition-all duration-500 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${truck.type === 'Camión'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-emerald-50 text-emerald-600'
                    }`}
                >
                  {truck.type}
                </span>
              </div>
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter shrink-0">
                    {truck.name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Unidad Operativa
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Capacidad Peso
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {truck.capacity_kg} kg | {truck.fuel_capacity || 0} L
                  </span>
                </div>
                {truck.insurance_policy ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">
                        Póliza
                      </span>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {truck.insurance_policy}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        {truck.insurance_name || 'Aseguradora'}
                      </span>
                      <span className="text-[9px] font-black text-slate-400">
                        {truck.insurance_type}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      Póliza
                    </span>
                    <span className="text-xs font-black text-slate-300 italic">
                      No Registrada
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIP Carga</span>
                  <span className="text-sm font-black text-slate-700 font-mono">
                    {truck.loading_nip || '----'}
                  </span>
                </div>
                {truck.is_refrigerated === 1 && (
                  <div className="flex items-center space-x-1 text-blue-500 text-[10px] font-black uppercase mt-1">
                    <span>❄️ Unidad Refrigerada</span>
                  </div>
                )}
                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleEdit(truck)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => setConfirmAction({
                    isOpen: true,
                    title: 'Eliminar Unidad',
                    message: '¿Estás seguro de eliminar esta unidad permanentemente?',
                    action: async () => {
                      await window.api.db.delete('trucks', truck.id)
                      loadTrucks()
                    }
                  })}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
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
                {editingTruck ? 'Editar' : 'Nueva'} <span className="text-red-600">Unidad</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-10 right-10 text-slate-300 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-full"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Identificador de la Unidad
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tipo de Unidad (Vehiculo)
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none bg-white font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="Camión">Camión</option>
                    <option value="Camioneta">Camioneta</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Capacidad (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity_kg}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity_kg: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Capacidad Tanque (L)
                  </label>
                  <input
                    type="number"
                    value={formData.fuel_capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, fuel_capacity: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Aseguradora
                  </label>
                  <input
                    type="text"
                    value={formData.insurance_name}
                    onChange={(e) => setFormData({ ...formData, insurance_name: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tipo de Seguro
                  </label>
                  <select
                    value={formData.insurance_type}
                    onChange={(e) => setFormData({ ...formData, insurance_type: e.target.value as any })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="Cobertura amplia">Cobertura amplia</option>
                    <option value="Daños a terceros">Daños a terceros</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Póliza de Seguro
                </label>
                <input
                  type="text"
                  value={formData.insurance_policy}
                  onChange={(e) => setFormData({ ...formData, insurance_policy: e.target.value })}
                  placeholder="Ej. POL-12345678"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    NIP de Carga
                  </label>
                  <input
                    type="text"
                    value={formData.loading_nip}
                    onChange={(e) => setFormData({ ...formData, loading_nip: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Refrigerada
                  </label>
                  <select
                    value={formData.is_refrigerated}
                    onChange={(e) => setFormData({ ...formData, is_refrigerated: parseInt(e.target.value) })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900 cursor-pointer"
                  >
                    <option value={1}>Sí</option>
                    <option value={0}>No</option>
                  </select>
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
                  className="flex-[2] bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-red-500/25 hover:bg-red-700 transition-all active:scale-[0.98]"
                >
                  {editingTruck ? 'Guardar' : 'Confirmar'}
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

export default TrucksView
