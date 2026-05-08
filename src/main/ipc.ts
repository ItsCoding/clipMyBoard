import { ipcMain } from 'electron'
import type { AppSettings } from '../shared/types'
import { getStartupWizardInfo } from './services/capabilities'
import type { ClipboardMonitor } from './services/clipboard'
import type { DrawerWindowService } from './services/drawerWindow'
import { pasteIntoFocusedApp } from './services/paste'
import type { StorageService } from './services/storage'

interface IpcServices {
  storage: StorageService
  monitor: ClipboardMonitor
  drawer: DrawerWindowService
  updateShortcut: (settings: AppSettings) => void
}

export function registerIpcHandlers({ storage, monitor, drawer, updateShortcut }: IpcServices): void {
  ipcMain.handle('entries:list', (_event, query?: string) => storage.listEntries(query))

  ipcMain.handle('entries:paste', async (_event, id: string) => {
    const entry = storage.getEntry(id)
    if (!entry) return false
    monitor.writeEntry(entry)
    drawer.hide()
    return pasteIntoFocusedApp()
  })

  ipcMain.handle('entries:delete', (_event, id: string) => {
    storage.deleteEntry(id)
    drawer.broadcastEntriesChanged()
  })

  ipcMain.handle('entries:togglePin', (_event, id: string) => {
    const entry = storage.togglePin(id)
    drawer.broadcastEntriesChanged()
    return entry
  })

  ipcMain.handle('entries:clear', () => {
    storage.clearHistory()
    drawer.broadcastEntriesChanged()
  })

  ipcMain.handle('settings:get', () => storage.getSettings())

  ipcMain.handle('settings:update', (_event, patch: Partial<AppSettings>) => {
    const settings = storage.updateSettings(patch)
    updateShortcut(settings)
    return settings
  })

  ipcMain.handle('startup:wizardInfo', () => getStartupWizardInfo())
  ipcMain.handle('drawer:setExpanded', (_event, expanded: boolean) => drawer.setExpanded(expanded))
  ipcMain.handle('drawer:hide', () => drawer.hide())
}
