import { Menu, Tray, app, nativeImage } from 'electron'
import type { ClipboardMonitor } from './clipboard'
import type { DrawerWindowService } from './drawerWindow'
import type { StorageService } from './storage'

export class TrayService {
  private tray: Tray | null = null
  private paused = false

  constructor(
    private readonly drawer: DrawerWindowService,
    private readonly monitor: ClipboardMonitor,
    private readonly storage: StorageService,
    private readonly onChanged: () => void
  ) {}

  create(): void {
    const icon = nativeImage.createEmpty()
    this.tray = new Tray(icon)
    this.tray.setToolTip('ClipMyBoard')
    this.refreshMenu()
  }

  private refreshMenu(): void {
    if (!this.tray) return

    const menu = Menu.buildFromTemplate([
      { label: 'Open Drawer', click: () => this.drawer.show() },
      {
        label: this.paused ? 'Resume Monitoring' : 'Pause Monitoring',
        click: () => {
          this.paused = !this.paused
          this.monitor.setPaused(this.paused)
          this.refreshMenu()
        }
      },
      { type: 'separator' },
      {
        label: 'Clear History',
        click: () => {
          this.storage.clearHistory()
          this.onChanged()
        }
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])

    this.tray.setContextMenu(menu)
  }
}
