import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import * as fs from 'fs'
import { join } from 'path'
import { initDB, closeDB } from '../database'

export function registerDbHandlers() {
  ipcMain.handle('db:list', (_, table: string) => {
    const db = initDB()
    return db.prepare(`SELECT * FROM ${table}`).all()
  })

  ipcMain.handle('db:get', (_, table: string, id: number) => {
    const db = initDB()
    return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)
  })

  ipcMain.handle('db:create', (_, table: string, data: any) => {
    const db = initDB()
    const keys = Object.keys(data)
    const placeholders = keys.map(() => '?').join(', ')
    const values = Object.values(data)
    const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`)
    return stmt.run(...values)
  })

  ipcMain.handle('db:update', (_, table: string, id: number, data: any) => {
    const db = initDB()
    const keys = Object.keys(data)
    const sets = keys.map((key) => `${key} = ?`).join(', ')
    const values = [...Object.values(data), id]
    const stmt = db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`)
    return stmt.run(...values)
  })

  ipcMain.handle('db:delete', (_, table: string, id: number) => {
    const db = initDB()
    return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
  })

  ipcMain.handle('db:export', async (event) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    if (!win) return { success: false, error: 'No active window found' }

    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Exportar Base de Datos',
      defaultPath: `bamx_backup_${new Date().toISOString().split('T')[0]}.db`,
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!filePath) return { success: false, cancelled: true }

    try {
      // Use better-sqlite3 native backup feature to safely export
      // This flushes all WAL changes and prevents exporting a locked/corrupt file
      const db = initDB()
      await db.backup(filePath)
      return { success: true }
    } catch (error: any) {
      console.error('Error exporting database via native backup:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:import', async (event) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    if (!win) return { success: false, error: 'No active window found' }

    const { filePaths } = await dialog.showOpenDialog(win, {
      title: 'Importar Base de Datos',
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (!filePaths || filePaths.length === 0) return { success: false, cancelled: true }

    const selectedPath = filePaths[0]

    try {
      // Safety check: verify that the chosen file is actually a valid SQLite database
      const DatabaseConstructor = require('better-sqlite3')
      let testDb: any = null
      try {
        testDb = new DatabaseConstructor(selectedPath, { readonly: true })
        // Attempt a simple query to ensure schemas are readable
        testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
      } catch (e: any) {
        return { success: false, error: 'El archivo seleccionado no es una base de datos SQLite válida o está dañado.' }
      } finally {
        if (testDb) testDb.close()
      }

      const userDataPath = app.getPath('userData')
      const dbPath = join(userDataPath, 'banco_alimentos.db')

      // 1. Close current connection
      closeDB()

      // 2. Safely replace the file
      fs.copyFileSync(selectedPath, dbPath)

      // 3. Re-initialize
      initDB()

      return { success: true }
    } catch (error: any) {
      console.error('Error importing database:', error)
      return { success: false, error: error.message }
    }
  })
}

