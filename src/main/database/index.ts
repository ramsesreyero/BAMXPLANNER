import Database, { Database as DbType } from 'better-sqlite3'
import { app } from 'electron'
import { join, dirname } from 'path'
import * as fs from 'fs'
import { schema } from './schema'

let db: DbType | null = null
const BUILT_IN_GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

export function initDB(): DbType {
  if (db) return db

  let userDataPath = app.getPath('userData')
  
  // Normalize path to resolve non-ASCII/spaces in Windows user directory
  try {
    if (fs.existsSync(userDataPath)) {
      userDataPath = fs.realpathSync(userDataPath)
    }
  } catch (e) {
    console.warn('Could not resolve real path for userData:', e)
  }

  const dbPath = join(userDataPath, 'banco_alimentos.db')

  // Asegurar que el directorio exista (normalmente userData existe, pero es mejor verificar)
  const dir = dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  console.log('Opening database at:', dbPath)
  try {
    // Timeout of 5000ms prevents the application from freezing forever in the background
    // if the database file is locked or busy.
    db = new Database(dbPath, { timeout: 5000 })
    
    // Enable Foreign Keys, WAL mode for crash resilience, and Normal synchrony for speed/safety
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    
    console.log('Database opened successfully with WAL mode enabled')
  } catch (err) {
    console.error('FAILED TO OPEN DATABASE:', err)
    throw err
  }

  // Aplicar esquema
  console.log('Applying schema...')
  try {
    db.exec(schema)
    console.log('Schema applied successfully')
  } catch (err) {
    console.error('FAILED TO APPLY SCHEMA:', err)
  }

  // Aplicar migraciones (adicion segura de columnas)
  console.log('Applying migrations...')
  const tables = {
    supermarkets: [
      'is_foreign INTEGER DEFAULT 0',
      'avg_volume REAL DEFAULT 0',
      'loading_time REAL DEFAULT 0',
      'lat REAL',
      'lng REAL'
    ],
    colonies: [
      'recovery_fee REAL DEFAULT 0',
      'pantry_count INTEGER DEFAULT 0',
      'lat REAL',
      'lng REAL',
      'manager_name TEXT',
      'phone TEXT'
    ],
    institutions: [
      'estimated_kg REAL DEFAULT 0',
      'delivery_time REAL DEFAULT 0',
      'lat REAL',
      'lng REAL'
    ],
    beneficiaries: [
      'restriction_day TEXT DEFAULT "Ninguna"',
      'lat REAL',
      'lng REAL',
      'folio TEXT',
      'phone TEXT',
      'pb TEXT'
    ],
    drivers: [
      'photo_url TEXT',
      'license_data TEXT',
      'license_photo TEXT',
      'is_available INTEGER DEFAULT 1'
    ],
    trucks: [
      'capacity_kg REAL DEFAULT 0',
      'fuel_capacity REAL DEFAULT 0',
      'insurance_policy TEXT',
      'insurance_name TEXT',
      'insurance_phone TEXT',
      'insurance_type TEXT DEFAULT "Cobertura amplia"',
      'loading_nip TEXT',
      'is_refrigerated INTEGER DEFAULT 1',
      'is_available INTEGER DEFAULT 1'
    ]
  }

  for (const [table, columns] of Object.entries(tables)) {
    for (const columnDef of columns) {
      try {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`).run()
      } catch (e) {
        // Ignorado
      }
    }
  }
  console.log('Migrations finished')

  const existingGoogleMode = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('use_google_maps') as { value: string } | undefined
  if (!existingGoogleMode) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      'use_google_maps',
      BUILT_IN_GOOGLE_MAPS_API_KEY ? 'true' : 'false'
    )
  }

  // Verificar e imprimir el estado actual del esquema

  try {
    const columns = db.prepare("PRAGMA table_info(colonies)").all() as any[]
    console.log('Columns in colonies:', columns.map(c => c.name).join(', '))
  } catch (e) {
    console.error('Error checking schema:', e)
  }

  return db
}

export function getDB(): DbType {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.')
  }
  return db
}

export function closeDB(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database connection closed successfully.')
  }
}
