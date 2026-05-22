import { ipcMain } from 'electron'
import { initDB } from '../database'

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async (_, key: string) => {
    const db = initDB()
    return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  })

  ipcMain.handle('settings:set', async (_, key: string, value: string) => {
    const db = initDB()
    return db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  })
}
