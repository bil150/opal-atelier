import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { APP_VERSION_ARG } from '../preload/opal-api'

const WINDOW_SIZE = { width: 1280, height: 860, minWidth: 360, minHeight: 480 } as const

/** Only web links leave the app, and they open in the user's browser. */
function openExternally(url: string): void {
  if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0F141D',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
      additionalArguments: [`${APP_VERSION_ARG}${app.getVersion()}`],
    },
  })

  window.once('ready-to-show', () => window.show())

  // New windows (target="_blank", window.open) go to the default browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternally(url)
    return { action: 'deny' }
  })

  // The app never navigates away from its own page: routing is hash-based.
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault()
      openExternally(url)
    }
  })

  const devServerUrl = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devServerUrl) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(() => {
    mainWindow = createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
