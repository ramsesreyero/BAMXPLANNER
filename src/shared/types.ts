// Modelos de dominio derivados del esquema de base de datos

export interface Colony {
  id: number
  name: string
  type: 'Urbana' | 'Rural'
  pantry_count: number
  collection_point: string
  frequency: string
  preferred_day: string
  lat: number
  lng: number
  recovery_fee: number
}

export interface Beneficiary {
  id: number
  name: string
  address: string
  restriction_day: string
  avg_delivery_time: number
}

export interface Institution {
  id: number
  name: string
  address: string
  fixed_day: string
  estimated_kg: number
  delivery_time: number
  lat: number
  lng: number
}

export interface Supermarket {
  id: number
  name: string
  address: string
  collection_days: string
  avg_volume: number
  loading_time: number
  lat: number
  lng: number
  is_foreign: number
}

export interface Donation {
  id: number
  location: string
  date: string
  estimated_volume: number
}

export interface Truck {
  id: number
  name: string
  capacity_kg: number
  capacity_volume: number
  insurance_policy?: string
  type: 'Camión' | 'Camioneta'
}

export interface Driver {
  id: number
  name: string
  photo_url?: string
  license_data?: string
  available_days: string
  max_hours_per_day: number
}

export interface Warehouse {
  id: number
  address: string
  coordinates: string
  opening_time: string
  closing_time: string
  avg_unloading_time: number
}

export interface Route {
  id: number
  date: string
  truck_id: number
  driver_id: number
  status: 'Pendiente' | 'Completada' | 'Cancelada'
  type: 'Entrega' | 'Recolección' | 'Institucional' | 'Caridad'
  
  // Campos unidos
  truck_name?: string
  driver_name?: string
  stops?: RouteStopExtended[]
}

export type StopType = 'Colonia' | 'Institución' | 'Supermercado' | 'Beneficiario' | 'Donación' | 'Almacén'

export interface RouteStop {
  id: number
  route_id: number
  stop_type: StopType
  stop_id: number
  sequence_order: number
}

// Detalles extendidos recuperados por la API
export interface RouteStopExtended extends RouteStop {
  stop_name: string
  recovery_fee: number
  is_foreign: number
  volume: number
  [key: string]: any
}

// Modelos de planificacion
export interface MonthSummary {
  date: string
  routes_count: number
  total_recovery: number
  total_volume: number
}
