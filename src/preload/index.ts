import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  db: {
    list: (table: string) => ipcRenderer.invoke('db:list', table),
    get: (table: string, id: number) => ipcRenderer.invoke('db:get', table, id),
    create: (table: string, data: any) => ipcRenderer.invoke('db:create', table, data),
    update: (table: string, id: number, data: any) =>
      ipcRenderer.invoke('db:update', table, id, data),
    delete: (table: string, id: number) => ipcRenderer.invoke('db:delete', table, id)
  },
  planning: {
    getSuggestions: (date: string) => ipcRenderer.invoke('planning:get-suggestions', date),
    createRoute: (routeData: any) => ipcRenderer.invoke('planning:create-route', routeData),
    addStop: (stopData: any) => ipcRenderer.invoke('planning:add-stop', stopData),
    getRoutes: (date: string) => ipcRenderer.invoke('planning:get-routes', date),
    getRecentActivities: () => ipcRenderer.invoke('planning:getRecentActivities'),
    saveMonthlyPlan: (data: { plan: any[], startDate: string, endDate: string }) => 
      ipcRenderer.invoke('planning:save-monthly-plan', data),
    getAvailableMonths: () => ipcRenderer.invoke('planning:get-available-months'),
    getMonthSummary: (year: number, month: number) => ipcRenderer.invoke('planning:get-month-summary', { year, month }),
    getMonthPlan: (year: number, month: number) => ipcRenderer.invoke('planning:get-month-plan', { year, month }),
    seedData: () => ipcRenderer.invoke('planning:seed-data')
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
