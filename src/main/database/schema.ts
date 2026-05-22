export const schema = `
CREATE TABLE IF NOT EXISTS colonies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('Urbana', 'Rural')) DEFAULT 'Urbana',
  pantry_count INTEGER DEFAULT 0,
  collection_point TEXT, -- direccion o coordenadas
  frequency TEXT, -- ej. 'Quincenal'
  preferred_day TEXT, -- ej. 'Lunes'
  lat REAL,
  lng REAL,
  recovery_fee REAL DEFAULT 0,
  manager_name TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS beneficiaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, -- Ruta de la caridad
  address TEXT,
  avg_delivery_time REAL DEFAULT 0, -- minutos
  lat REAL,
  lng REAL,
  folio TEXT,
  phone TEXT,
  pb TEXT
);

CREATE TABLE IF NOT EXISTS institutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  fixed_day TEXT, -- ej. 'Lunes-Viernes'
  estimated_kg REAL DEFAULT 0,
  delivery_time REAL DEFAULT 0, -- minutos
  lat REAL,
  lng REAL
);

CREATE TABLE IF NOT EXISTS supermarkets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  collection_days TEXT, -- ej. 'Lunes-Sabado'
  avg_volume REAL DEFAULT 0,
  loading_time REAL DEFAULT 0, -- minutos
  lat REAL,
  lng REAL,
  is_foreign INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location TEXT,
  date TEXT,
  estimated_volume REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trucks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  capacity_kg REAL DEFAULT 0,
  capacity_volume REAL DEFAULT 0,
  fuel_capacity REAL DEFAULT 0,
  insurance_policy TEXT,
  insurance_name TEXT,
  insurance_phone TEXT,
  insurance_type TEXT CHECK(insurance_type IN ('Cobertura amplia', 'Daños a terceros')) DEFAULT 'Cobertura amplia',
  loading_nip TEXT,
  is_refrigerated INTEGER DEFAULT 1,
  type TEXT CHECK(type IN ('Camión', 'Camioneta')) DEFAULT 'Camión'
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  photo_url TEXT,
  license_data TEXT,
  license_photo TEXT,
  available_days TEXT, -- ej. 'Lunes,Martes,...'
  max_hours_per_day REAL DEFAULT 8
);

CREATE TABLE IF NOT EXISTS warehouse (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Fila unica para configuracion
  address TEXT,
  coordinates TEXT, -- lat,lng
  opening_time TEXT,
  closing_time TEXT,
  avg_unloading_time REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  truck_id INTEGER,
  driver_id INTEGER,
  status TEXT DEFAULT 'Pendiente' CHECK(status IN ('Pendiente', 'Completada', 'Cancelada')),
  type TEXT CHECK(type IN ('Entrega', 'Recolección', 'Institucional', 'Caridad')),
  FOREIGN KEY(truck_id) REFERENCES trucks(id),
  FOREIGN KEY(driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS route_stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER,
  stop_type TEXT CHECK(stop_type IN ('Colonia', 'Institución', 'Supermercado', 'Beneficiario', 'Donación', 'Almacén')),
  stop_id INTEGER,
  sequence_order INTEGER,
  FOREIGN KEY(route_id) REFERENCES routes(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`
