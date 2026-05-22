/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      db: {
        list: (table: string) => Promise<any[]>
        get: (table: string, id: number) => Promise<any>
        create: (table: string, data: any) => Promise<any>
        update: (table: string, id: number, data: any) => Promise<any>
        delete: (table: string, id: number) => Promise<any>
      }
      planning: {
        getSuggestions: (date: string) => Promise<any[]>
        createRoute: (routeData: any) => Promise<any>
        addStop: (stopData: any) => Promise<any>
        getRoutes: (date: string) => Promise<any[]>
        getRecentActivities: () => Promise<any[]>
        saveMonthlyPlan: (data: { plan: any[], startDate: string, endDate: string }) => Promise<{ success: boolean }>
        getAvailableMonths: () => Promise<any[]>
        getMonthSummary: (year: number, month: number) => Promise<any[]>
        getMonthPlan: (year: number, month: number) => Promise<any>
        seedData: () => Promise<{ success: boolean }>
      }
      settings: {
        get: (key: string) => Promise<any>
        set: (key: string, value: string) => Promise<any>
      }
      window: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
      }
    }
  }
}

export {}
