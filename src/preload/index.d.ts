export {};

declare global {
  interface Window {
    api: {
      db: {
        list: (table: string) => Promise<any[]>;
        get: (table: string, id: number) => Promise<any>;
        create: (table: string, data: any) => Promise<any>;
        update: (table: string, id: number, data: any) => Promise<any>;
        delete: (table: string, id: number) => Promise<any>;
        exportDatabase: () => Promise<any>;
        importDatabase: () => Promise<any>;
      };
      planning: {
        getSuggestions: (date: string) => Promise<any[]>;
        createRoute: (routeData: any) => Promise<any>;
        addStop: (stopData: any) => Promise<any>;
        getRoutes: (date: string) => Promise<any[]>;
        getRecentActivities: () => Promise<any[]>;
        saveMonthlyPlan: (data: { plan: any[]; startDate: string; endDate: string }) => Promise<any>;
        getAvailableMonths: () => Promise<any[]>;
        getMonthSummary: (year: number, month: number) => Promise<any[]>;
        getMonthPlan: (year: number, month: number) => Promise<any>;
        seedData: () => Promise<any>;
      };
      settings: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: string) => Promise<any>;
        checkUpdates: () => Promise<{ success: boolean; tag_name?: string; html_url?: string; error?: string }>;
      };
      googleMaps: {
        geocode: (address: string) => Promise<{ success: boolean; address?: string; lat?: number; lng?: number; error?: string }>;
        reverseGeocode: (lat: number, lng: number) => Promise<{ success: boolean; address?: string; lat?: number; lng?: number; error?: string }>;
        getDistanceMatrix: (points: { lat: number; lng: number }[]) => Promise<{ distances: number[][]; durations: number[][]; success: boolean; error?: string }>;
        getDirections: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, waypoints?: { lat: number; lng: number }[]) => Promise<{ data: any; success: boolean; error?: string }>;
        verifyKey: (key: string) => Promise<{ success: boolean; message: string }>;
      };
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        getVersion: () => Promise<string>;
      };
    };
  }
}
