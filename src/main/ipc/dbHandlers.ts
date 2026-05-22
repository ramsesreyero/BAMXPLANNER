import { ipcMain } from 'electron'
import { initDB } from '../database'

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
}
