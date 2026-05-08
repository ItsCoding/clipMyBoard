import type { AppSettings } from './types'

export const defaultSettings: AppSettings = {
  shortcut: 'Shift+Control+V',
  monitorClipboard: true,
  launchAtLogin: false,
  setupWizardCompleted: false,
  maxEntries: 500,
  maxEntryBytes: 10 * 1024 * 1024,
  ignoredApps: [],
  secretPatterns: [
    '-----BEGIN [A-Z ]+PRIVATE KEY-----',
    '(?i)(api[_-]?key|secret|token|password)\\s*[:=]\\s*[\\w.-]{12,}'
  ],
  theme: 'system'
}
