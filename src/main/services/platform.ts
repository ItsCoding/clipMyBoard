import type { PlatformWarning } from '../../shared/types'

export function getPlatformWarnings(): PlatformWarning[] {
  const warnings: PlatformWarning[] = []

  if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE?.toLowerCase() === 'wayland') {
    warnings.push({
      id: 'linux-wayland',
      title: 'Wayland limitations',
      message: 'Some Linux Wayland compositors restrict background clipboard access and global shortcuts. If the drawer shortcut or monitoring is unreliable, try an X11 session or configure a desktop-level shortcut.'
    })
  }

  if (process.platform === 'win32') {
    warnings.push({
      id: 'win-v-conflict',
      title: 'Win+V is reserved',
      message: 'Windows uses Win+V for its built-in clipboard history. ClipMyBoard defaults to Shift+Ctrl+V; use Win+V only if you disable or override the system behavior.'
    })
  }

  if (process.platform === 'darwin') {
    warnings.push({
      id: 'macos-accessibility',
      title: 'macOS permissions',
      message: 'macOS may require accessibility permission before apps can automate paste into another app.'
    })
  }

  return warnings
}
