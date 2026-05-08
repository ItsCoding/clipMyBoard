import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'
import type { AppSettings } from '../../shared/types'
import { defaultSettings } from '../../shared/defaults'

export class DrawerWindowService {
  private window: BrowserWindow | null = null
  private expanded = false
  private settings: AppSettings = defaultSettings

  getWindow(): BrowserWindow | null {
    return this.window
  }

  applySettings(settings: AppSettings): void {
    this.settings = settings
    if (this.window && !this.window.isDestroyed()) {
      this.window.setOpacity(clamp(settings.opacity, 0.3, 1))
      if (this.window.isVisible()) this.position(this.window)
      this.window.webContents.send('settings:changed', settings)
    }
  }

  create(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) return this.window

    this.window = new BrowserWindow({
      width: 1180,
      height: 360,
      show: false,
      frame: false,
      resizable: true,
      maximizable: false,
      minimizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundColor: '#00000000',
      transparent: true,
      opacity: clamp(this.settings.opacity, 0.3, 1),
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
    drawer.setOpacity(clamp(this.settings.opacity, 0.3, 1))
    this.position(drawer)

    drawer.setAlwaysOnTop(true, 'floating')
    drawer.show()
    drawer.focus()
    drawer.webContents.send('drawer:shown')
  }

  setExpanded(expanded: boolean): void {
    this.expanded = expanded
    const drawer = this.create()
    this.position(drawer)
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) this.window.hide()
  }

  broadcastEntriesChanged(): void {
    if (this.window && !this.window.isDestroyed()) this.window.webContents.send('entries:changed')
  }

  private position(drawer: BrowserWindow): void {
    const { settings } = this
    const display = this.pickDisplay()
    const work = display.workArea

    const widthPct = this.expanded ? settings.expandedWidthPercent : settings.compactWidthPercent
    const heightPct = this.expanded ? settings.expandedHeightPercent : settings.compactHeightPercent

    const width = clampInt(Math.round(work.width * (widthPct / 100)), 480, work.width - 16)
    const height = clampInt(Math.round(work.height * (heightPct / 100)), 240, work.height - 16)

    const margin = 18
    let x: number
    let y: number

    switch (settings.alignment) {
      case 'top':
        x = work.x + Math.round((work.width - width) / 2)
        y = work.y + margin
        break
      case 'bottom':
        x = work.x + Math.round((work.width - width) / 2)
        y = work.y + work.height - height - margin
        break
      case 'left':
        x = work.x + margin
        y = work.y + Math.round((work.height - height) / 2)
        break
      case 'right':
        x = work.x + work.width - width - margin
        y = work.y + Math.round((work.height - height) / 2)
        break
      case 'center':
        x = work.x + Math.round((work.width - width) / 2)
        y = work.y + Math.round((work.height - height) / 2)
        break
      case 'cursor': {
        const cursor = screen.getCursorScreenPoint()
        x = clampInt(cursor.x - Math.round(width / 2), work.x, work.x + work.width - width)
        y = clampInt(cursor.y - Math.round(height / 2), work.y, work.y + work.height - height)
        break
      }
      default:
        x = work.x + Math.round((work.width - width) / 2)
        y = work.y + margin
    }

    drawer.setBounds({ x, y, width, height })
  }

  private pickDisplay() {
    if (this.settings.monitorTarget === 'primary') return screen.getPrimaryDisplay()
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, value))
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max))
}
