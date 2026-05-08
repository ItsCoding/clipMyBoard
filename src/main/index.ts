import { app, nativeTheme } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { getAppPaths } from './services/appPaths'
import { ClipboardMonitor } from './services/clipboard'
import { DrawerWindowService } from './services/drawerWindow'
import { HotkeyService } from './services/hotkeys'
import { StorageService } from './services/storage'
import { TrayService } from './services/tray'
import { registerIpcHandlers } from './ipc'
import type { AppSettings } from '../shared/types'

let hotkeys: HotkeyService | null = null

app.disableHardwareAcceleration()

function applyTheme(theme: AppSettings['theme']): void {
  nativeTheme.themeSource = theme
}

function ensureSingleInstance(): void {
  if (!app.requestSingleInstanceLock()) app.quit()
}

async function bootstrap(): Promise<void> {
  ensureSingleInstance()
  await app.whenReady()

  electronApp.setAppUserModelId('dev.clipmyboard.app')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  const paths = getAppPaths()
  const storage = new StorageService(paths.databasePath)
  const drawer = new DrawerWindowService()
  const monitor = new ClipboardMonitor(storage, paths.assetsDir, () => drawer.broadcastEntriesChanged())
  hotkeys = new HotkeyService()

  const updateShortcut = (settings: AppSettings): void => {
    hotkeys?.register(settings.shortcut, () => drawer.show())
  }

  registerIpcHandlers({ storage, monitor, drawer, updateShortcut })

  const settings = storage.getSettings()
  applyTheme(settings.theme)
  updateShortcut(settings)
  drawer.create()
  monitor.start()

  const tray = new TrayService(drawer, monitor, storage, () => drawer.broadcastEntriesChanged())
  tray.create()

  app.on('second-instance', () => drawer.show())
  app.on('activate', () => drawer.show())
}

void bootstrap()

app.on('window-all-closed', () => {
  // Keep the tray app alive after the hidden drawer window is closed.
})

app.on('before-quit', () => {
  hotkeys?.dispose()
})
