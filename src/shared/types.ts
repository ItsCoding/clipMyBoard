export type ClipboardEntryKind = 'text' | 'url' | 'html' | 'image' | 'files'

export interface ClipboardEntry {
  id: string
  createdAt: string
  updatedAt: string
  kind: ClipboardEntryKind
  plainText?: string
  html?: string
  imagePath?: string
  filePaths?: string[]
  sourceApp?: string
  preview: string
  hash: string
  isPinned: boolean
  tags: string[]
  byteSize: number
}

export interface AppSettings {
  shortcut: string
  monitorClipboard: boolean
  launchAtLogin: boolean
  setupWizardCompleted: boolean
  maxEntries: number
  maxEntryBytes: number
  ignoredApps: string[]
  secretPatterns: string[]
  theme: 'system' | 'light' | 'dark'
  accentColor: string
  opacity: number
  animationsEnabled: boolean
  alignment: DrawerAlignment
  monitorTarget: 'cursor' | 'primary'
  compactWidthPercent: number
  compactHeightPercent: number
  expandedWidthPercent: number
  expandedHeightPercent: number
}

export type DrawerAlignment = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'cursor'

export interface CaptureCandidate {
  kind: ClipboardEntryKind
  plainText?: string
  html?: string
  imagePng?: Buffer
  filePaths?: string[]
}

export interface PlatformWarning {
  id: string
  title: string
  message: string
}

export type CapabilityStatus = 'ok' | 'recommended' | 'missing' | 'limited'

export interface CapabilityCheck {
  id: string
  title: string
  status: CapabilityStatus
  description: string
  installCommand?: string
}

export interface StartupWizardInfo {
  platform: NodeJS.Platform
  sessionType?: string
  recommendation: string
  checks: CapabilityCheck[]
}

export interface ClipboardApi {
  listEntries: (query?: string) => Promise<ClipboardEntry[]>
  pasteEntry: (id: string) => Promise<boolean>
  deleteEntry: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<ClipboardEntry | null>
  clearHistory: () => Promise<void>
  getSettings: () => Promise<AppSettings>
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  getStartupWizardInfo: () => Promise<StartupWizardInfo>
  setDrawerExpanded: (expanded: boolean) => Promise<void>
  hideDrawer: () => Promise<void>
  onEntriesChanged: (callback: () => void) => () => void
  onSettingsChanged: (callback: (settings: AppSettings) => void) => () => void
}

declare global {
  interface Window {
    clipmyboard: ClipboardApi
  }
}
