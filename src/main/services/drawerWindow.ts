import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'

export class DrawerWindowService {
  private window: BrowserWindow | null = null

  getWindow(): BrowserWindow | null {
    return this.window
  }

  create(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) return this.window

    this.window = new BrowserWindow({
      width: 1180,
      height: 250,
      show: false,
      frame: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundColor: '#00000000',
      transparent: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    this.window.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url)
      return { action: 'deny' }
    })

    this.window.on('blur', () => {
      this.hide()
    })

    if (process.env.VITE_DEV_SERVER_URL) {
      void this.window.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
      void this.window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return this.window
  }

  show(): void {
    const drawer = this.create()
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const width = Math.min(1180, display.workArea.width - 32)
    const height = 250
    const x = display.workArea.x + Math.round((display.workArea.width - width) / 2)
    const y = display.workArea.y + 18

    drawer.setBounds({ x, y, width, height })
    drawer.setAlwaysOnTop(true, 'floating')
    drawer.show()
    drawer.focus()
    drawer.webContents.send('drawer:shown')
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) this.window.hide()
  }

  broadcastEntriesChanged(): void {
    if (this.window && !this.window.isDestroyed()) this.window.webContents.send('entries:changed')
  }
}
