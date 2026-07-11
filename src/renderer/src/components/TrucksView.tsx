import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, Truck } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import { TruckData } from '../types'

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
    type: 'Camión' as 'Camión' | 'Camioneta',
    is_available: 1
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
      setFormData({ name: '', capacity_kg: 0, capacity_volume: 0, fuel_capacity: 0, insurance_policy: '', insurance_name: '', insurance_phone: '', insurance_type: 'Cobertura amplia', loading_nip: '', is_refrigerated: 1, type: 'Camión', is_available: 1 })
      loadTrucks()
    } catch (error) {
      console.error('Error saving truck:', error)
    }
  }

  const handleEdit = (t: TruckData) => {
    setEditingTruck(t)
    setFormData({
      name: t.name || '',
      capacity_kg: t.capacity_kg || 0,
      capacity_volume: t.capacity_volume || 0,
      fuel_capacity: t.fuel_capacity || 0,
      insurance_policy: t.insurance_policy || '',
      insurance_name: t.insurance_name || '',
      insurance_phone: t.insurance_phone || '',
      insurance_type: t.insurance_type === 'Daños a terceros' ? 'Daños a terceros' : 'Cobertura amplia',
      loading_nip: t.loading_nip || '',
      is_refrigerated: t.is_refrigerated ?? 1,
      type: t.type === 'Camioneta' ? 'Camioneta' : 'Camión',
      is_available: t.is_available ?? 1
    })
    setIsModalOpen(true)
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
              Módulo de Logística
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter truncate">
            Gestión de <span className="text-orange-600">Unidades</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Administra la flota de vehículos, sus capacidades técnicas y disponibilidad operativa.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTruck(null)
            setFormData({ name: '', capacity_kg: 0, capacity_volume: 0, fuel_capacity: 0, insurance_policy: '', insurance_name: '', insurance_phone: '', insurance_type: 'Cobertura amplia', loading_nip: '', is_refrigerated: 1, type: 'Camión', is_available: 1 })
            setIsModalOpen(true)
          }}
          className="bg-gradient-to-b from-orange-500 to-orange-600 border border-orange-400 text-white px-8 py-4 rounded-2xl font-black shadow-[0_10px_30px_rgba(234,88,12,0.3)] hover:shadow-[0_20px_40px_rgba(234,88,12,0.4)] hover:to-orange-500 transition-all duration-300 active:scale-95 flex items-center space-x-2 group/btn relative overflow-hidden shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          <Plus size={20} className="relative z-10 mr-1 group-hover/btn:-rotate-90 transition-transform duration-500" />
          <span className="relative z-10">Nueva Unidad</span>
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full bg-white/60 backdrop-blur-xl rounded-[3rem] p-24 text-center border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-16 h-16 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin mx-auto mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Cargando Unidades...</p>
          </div>
        ) : trucks.length === 0 ? (
          <div className="col-span-full bg-white/60 backdrop-blur-xl rounded-[3rem] p-24 text-center border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-24 h-24 bg-white rounded-full shadow-inner flex items-center justify-center mx-auto mb-6">
              <Truck size={40} className="text-slate-300" />
            </div>
            <p className="text-slate-800 font-black text-2xl tracking-tight">No hay unidades registradas</p>
          </div>
        ) : (
          trucks.map((truck) => (
            <div
              key={truck.id}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg p-6 rounded-[2.5rem] border border-white dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(234,88,12,0.08)] hover:border-orange-100 dark:hover:border-orange-500/30 transition-all duration-100 dark:duration-500 group relative overflow-hidden flex flex-col"
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="self-end mb-4 relative z-10">
                <span
                  className={`inline-flex items-center text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-[0.2em] ring-1 whitespace-nowrap ${truck.type === 'Camión'
                    ? 'bg-orange-50 text-orange-600 ring-orange-100'
                    : 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                    }`}
                >
                  {truck.type}
                </span>
              </div>
              <div className="flex items-start gap-4 mb-6 relative z-10">
                <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 bg-orange-50 text-orange-600 ring-[6px] ring-white shadow-inner relative overflow-visible shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
                  <Truck size={24} className="relative z-10" />
                  {truck.is_refrigerated === 1 && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center shadow-sm ring-2 ring-[var(--app-bg)]" title="Unidad Refrigerada">
                      <span className="text-[10px] leading-none text-white font-bold">❄</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-tight break-words">
                    {truck.name}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    Unidad Operativa
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-5 border-t border-slate-100 mt-auto relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Capacidad Peso
                    </span>
                    <div className="flex items-end space-x-1">
                      <span className="text-2xl font-black text-slate-800 leading-none">
                        {truck.capacity_kg}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">kg</span>
                    </div>
                  </div>
                  <div className="flex flex-col border-l border-slate-100 pl-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Combustible
                    </span>
                    <div className="flex items-end space-x-1">
                      <span className="text-2xl font-black text-slate-800 leading-none">
                        {truck.fuel_capacity || 0}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lts</span>
                    </div>
                  </div>
                </div>
                {truck.insurance_policy ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Póliza</span>
                      <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md uppercase tracking-[0.2em]">
                        {truck.insurance_policy}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {truck.insurance_name || 'Aseguradora'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-600">
                        {truck.insurance_type}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Póliza
                    </span>
                    <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1.5 rounded-md uppercase tracking-[0.2em] italic">
                      No Registrada
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIP Carga</span>
                  <span className="text-[9px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono tracking-widest">
                    {truck.loading_nip || '----'}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3 shadow-inner">
                  <div className="h-full bg-orange-500 rounded-full w-full" />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between relative z-10 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${truck.is_available !== 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {truck.is_available !== 0 ? 'Disponible' : 'Fuera de Servicio'}
                  </span>
                  <button
                    onClick={async () => {
                      const newStatus = truck.is_available !== 0 ? 0 : 1;
                      await window.api.db.update('trucks', truck.id, { is_available: newStatus });
                      loadTrucks();
                    }}
                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 outline-none flex items-center ${
                      truck.is_available !== 0 ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                        truck.is_available !== 0 ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(truck)}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 hover:shadow-inner rounded-xl transition-all"
                    title="Editar"
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
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-inner rounded-xl transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/20 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 relative bg-slate-50/50 shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter relative z-10">
                {editingTruck ? 'Gestión Técnica de' : 'Nueva'} <span className="text-red-600">Unidad</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-8 text-slate-300 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-full relative z-10"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Identificador de la Unidad
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tipo de Vehiculo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="Camión">Camión</option>
                    <option value="Camioneta">Camioneta</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Carga (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity_kg}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity_kg: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tanque (Lts)
                  </label>
                  <input
                    type="number"
                    value={formData.fuel_capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, fuel_capacity: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Aseguradora
                  </label>
                  <input
                    type="text"
                    value={formData.insurance_name}
                    onChange={(e) => setFormData({ ...formData, insurance_name: e.target.value })}
                    placeholder="Ej. AXA, Quálitas..."
                    className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Teléfono Aseguradora
                  </label>
                  <input
                    type="text"
                    value={formData.insurance_phone}
                    onChange={(e) => setFormData({ ...formData, insurance_phone: e.target.value })}
                    placeholder="800..."
                    className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Póliza de Seguro
                  </label>
                  <input
                    type="text"
                    value={formData.insurance_policy}
                    onChange={(e) => setFormData({ ...formData, insurance_policy: e.target.value })}
                    placeholder="Ej. POL-12345678"
                    className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tipo de Seguro
                  </label>
                  <select
                    value={formData.insurance_type}
                    onChange={(e) => setFormData({ ...formData, insurance_type: e.target.value as any })}
                    className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="Cobertura amplia">Cobertura amplia</option>
                    <option value="Daños a terceros">Daños a terceros</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    NIP de Carga
                  </label>
                  <input
                    type="text"
                    value={formData.loading_nip}
                    onChange={(e) => setFormData({ ...formData, loading_nip: e.target.value })}
                    placeholder="XXXX"
                    className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:bg-white focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    ¿Es Refrigerada?
                  </label>
                  <select
                    value={formData.is_refrigerated}
                    onChange={(e) => setFormData({ ...formData, is_refrigerated: parseInt(e.target.value) })}
                    className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900 cursor-pointer"
                  >
                    <option value={1}>Sí (Refrigerada)</option>
                    <option value={0}>No</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Disponibilidad de la Unidad
                </label>
                <select
                  value={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: parseInt(e.target.value) })}
                  className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-red-500/50 focus:ring-[4px] focus:ring-red-500/10 transition-all outline-none font-bold text-slate-900 cursor-pointer"
                >
                  <option value={1}>Activa / Disponible</option>
                  <option value={0}>Fuera de Servicio (Inactiva)</option>
                </select>
              </div>
              <div className="pt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-b from-red-500 to-red-600 border border-red-400 text-white py-4 rounded-2xl font-black shadow-[0_10px_30px_rgba(239,68,68,0.3)] hover:shadow-[0_20px_40px_rgba(239,68,68,0.4)] transition-all active:scale-[0.98] relative overflow-hidden group/submit"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                  <span className="relative z-10">{editingTruck ? 'Guardar Cambios' : 'Registrar Unidad'}</span>
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
