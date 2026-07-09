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

  ipcMain.handle('settings:check-updates', async () => {
    try {
      console.log('--- REQUISICIÓN DE ACTUALIZACIONES ENTRANDO AL PROCESO PRINCIPAL ---')
      const response = await fetch('https://api.github.com/repos/ramsesreyero/BAMXPLANNER/releases/latest', {
        headers: {
          'User-Agent': 'bamx-nuevo-laredo-planner'
        }
      })
      if (!response.ok) {
        throw new Error(`GitHub API respondió con estado ${response.status}`)
      }
      const data = (await response.json()) as { tag_name: string; html_url: string }
      return {
        success: true,
        tag_name: data.tag_name,
        html_url: data.html_url
      }
    } catch (error: any) {
      console.error('Error checking updates in main process:', error)
      return {
        success: false,
        error: error.message || 'Error de conexión con GitHub.'
      }
    }
  })
}
