import { ipcMain } from 'electron'
import { initDB } from '../database'

const BUILT_IN_GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async (_, key: string) => {
    const db = initDB()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    if (row) return row
    if (key === 'google_maps_api_key' && BUILT_IN_GOOGLE_MAPS_API_KEY) {
      return { value: BUILT_IN_GOOGLE_MAPS_API_KEY, builtIn: true }
    }
    if (key === 'use_google_maps') {
      return { value: BUILT_IN_GOOGLE_MAPS_API_KEY ? 'true' : 'false', builtIn: true }
    }
    return undefined
  })

  ipcMain.handle('settings:set', async (_, key: string, value: string) => {
    const db = initDB()
    return db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  })
}
