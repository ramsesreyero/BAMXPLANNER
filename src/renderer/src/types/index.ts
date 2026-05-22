export interface Colony {
  id: number
  name: string
  type: 'Urbana' | 'Rural'
  pantry_count: number
  collection_point: string
  manager_name?: string
  phone?: string
  frequency: string
  preferred_day: string
  lat?: number
  lng?: number
  recovery_fee: number
}

export interface Institution {
  id: number
  name: string
  address: string
  fixed_day: string
  estimated_kg: number
  delivery_time: number
  lat?: number
  lng?: number
}

export interface Supermarket {
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

export interface Beneficiary {
  id: number
  name: string
  address: string
  folio?: string
  phone?: string
  restriction_day: string
  avg_delivery_time: number
  lat?: number
  lng?: number
  pantry_count?: number
}

export interface TruckData {
  id: number
  name: string
  capacity_kg: number
  capacity_volume: number
  fuel_capacity: number
  insurance_policy: string
  insurance_name?: string
  insurance_phone?: string
  insurance_type?: 'Cobertura amplia' | 'Daños a terceros'
  loading_nip?: string
  is_refrigerated: number
  type: 'Camión' | 'Camioneta'
}

export interface Driver {
  id: number
  name: string
  photo_url?: string
  license_data?: string
  license_photo?: string
  available_days: string
  max_hours_per_day: number
}

export interface Holiday {
  date: string
  reason: string
}

export interface SavedMonth {
  monthId: string
  year: string
  month: string
}

// Added Route for planning view
export interface Route {
  id: number
  date: string
  truck_id: number
  driver_id: number
  stops: any[]
  status: string
}
