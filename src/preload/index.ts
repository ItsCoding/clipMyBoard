import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, ClipboardApi } from '../shared/types'

const api: ClipboardApi = {
  listEntries: (query?: string) => ipcRenderer.invoke('entries:list', query),
  pasteEntry: (id: string) => ipcRenderer.invoke('entries:paste', id),
  deleteEntry: (id: string) => ipcRenderer.invoke('entries:delete', id),
  togglePin: (id: string) => ipcRenderer.invoke('entries:togglePin', id),
  clearHistory: () => ipcRenderer.invoke('entries:clear'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:update', settings),
  getPlatformWarnings: () => ipcRenderer.invoke('platform:warnings'),
  getStartupWizardInfo: () => ipcRenderer.invoke('startup:wizardInfo'),
  hideDrawer: () => ipcRenderer.invoke('drawer:hide'),
  onEntriesChanged: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('entries:changed', listener)
    ipcRenderer.on('drawer:shown', listener)
    return () => {
      ipcRenderer.removeListener('entries:changed', listener)
      ipcRenderer.removeListener('drawer:shown', listener)
    }
  }
}

contextBridge.exposeInMainWorld('clipmyboard', api)
