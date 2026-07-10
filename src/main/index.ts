import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { initDB } from './database'
import { registerDbHandlers } from './ipc/dbHandlers'
import { registerPlanningHandlers } from './ipc/planningHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { registerWindowHandlers } from './ipc/windowHandlers'
import { registerGoogleMapsHandlers } from './ipc/googleMapsHandlers'

// ─── Single Instance Lock ─────────────────────────────────────────────────────
// Prevents multiple instances of the app from running concurrently, which
// locks the database file and freezes the app in the background.
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log('Another instance is already running. Quitting this instance.')
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus the existing window if user tries to open a second instance
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWin = windows[0]
      if (mainWin.isMinimized()) mainWin.restore()
      mainWin.focus()
    }
  })
}

function createWindow(): void {
  // Crear la ventana del navegador.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    frame: false, // Ventana personalizada sin marcos
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR para el renderizador basado en la cli de electron-vite.
  // Cargar la URL remota para desarrollo o el archivo html local para produccion.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Este metodo se llamara cuando Electron termine la
// inicializacion y este listo para crear ventanas de navegador.
// Algunas APIs solo se pueden usar despues de este evento.
app.whenReady().then(() => {
  // Configurar el id del modelo de usuario para Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.electron')
  }

  // Define minimal native Edit Menu to restore standard copy/paste/input keys on Windows production
  const template = [
    {
      label: 'Editar',
      submenu: [
        { label: 'Deshacer', role: 'undo' },
        { label: 'Rehacer', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Pegar', role: 'paste' },
        { label: 'Seleccionar todo', role: 'selectAll' }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template as any)
  Menu.setApplicationMenu(menu)

  // Inicializar la base de datos de manera segura
  let db: any = null
  try {
    db = initDB() // Obtener la instancia de la base de datos

    // Migracion simple para las coordenadas
    try {
      db.exec("ALTER TABLE colonies ADD COLUMN lat REAL;")
      db.exec("ALTER TABLE colonies ADD COLUMN lng REAL;")
    } catch (e) {}
    try {
      db.exec("ALTER TABLE institutions ADD COLUMN lat REAL;")
      db.exec("ALTER TABLE institutions ADD COLUMN lng REAL;")
    } catch (e) {}
    try {
      db.exec("ALTER TABLE supermarkets ADD COLUMN lat REAL;")
      db.exec("ALTER TABLE supermarkets ADD COLUMN lng REAL;")
    } catch (e) {}
    try {
      db.exec("ALTER TABLE beneficiaries ADD COLUMN lat REAL;")
      db.exec("ALTER TABLE beneficiaries ADD COLUMN lng REAL;")
    } catch (e) {}
  } catch (error: any) {
    console.error('Error crítico al inicializar la base de datos:', error)
    const { dialog } = require('electron')
    dialog.showErrorBox(
      'Error de Base de Datos',
      `No se pudo inicializar la base de datos de la aplicación.\n\nDetalles del error: ${error.message || error}\n\nSi el problema persiste, intenta renombrar o eliminar la carpeta del programa en %APPDATA%.`
    )
  }

  // Registrar los manejadores IPC modulares
  registerDbHandlers()
  registerPlanningHandlers()
  registerSettingsHandlers()
  registerWindowHandlers()
  registerGoogleMapsHandlers()

  // Prueba de IPC
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  // Initialize auto-updates in production mode
  if (app.isPackaged) {
    const { autoUpdater } = require('electron-updater')
    const { dialog } = require('electron')

    // Optional settings: download updates automatically in background
    autoUpdater.autoDownload = true

    // Check for updates
    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('update-downloaded', (info: any) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Actualización Disponible',
        message: `Una nueva versión (${info.version}) ha sido descargada. ¿Deseas reiniciar la aplicación para actualizar ahora?`,
        buttons: ['Reiniciar y Actualizar', 'Más tarde']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
    })

    autoUpdater.on('error', (err: any) => {
      console.error('Error in auto-updater:', err)
    })
  }

  app.on('activate', function () {
    // En macOS es comun volver a crear una ventana cuando se
    // hace clic en el icono del dock y no hay otras ventanas abiertas.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Salir cuando todas las ventanas esten cerradas, excepto en macOS.
// Alla es comun que las aplicaciones permanezcan activas hasta que
// el usuario decida salir explicitamente con Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

