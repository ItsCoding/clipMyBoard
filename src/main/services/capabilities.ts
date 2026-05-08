import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { CapabilityCheck, StartupWizardInfo } from '../../shared/types'

const execFileAsync = promisify(execFile)

export async function getStartupWizardInfo(): Promise<StartupWizardInfo> {
  if (process.platform === 'linux') return getLinuxInfo()

  if (process.platform === 'darwin') {
    return {
      platform: process.platform,
      recommendation: 'macOS works well for clipboard capture. Enable Accessibility permission if automatic paste should work into other apps.',
      checks: [
        {
          id: 'macos-accessibility',
          title: 'Accessibility permission',
          status: 'recommended',
          description: 'Required only for automatic paste simulation. Manual Ctrl/Cmd+V after selection works without it.'
        }
      ]
    }
  }

  if (process.platform === 'win32') {
    return {
      platform: process.platform,
      recommendation: 'Windows works well. Keep Shift+Ctrl+V as default because Win+V conflicts with Windows Clipboard History.',
      checks: [
        {
          id: 'win-v',
          title: 'Avoid Win+V shortcut',
          status: 'recommended',
          description: 'Win+V is reserved by Windows. Shift+Ctrl+V is the safer app shortcut.'
        }
      ]
    }
  }

  return {
    platform: process.platform,
    recommendation: 'This platform is not a primary target yet.',
    checks: []
  }
}

async function getLinuxInfo(): Promise<StartupWizardInfo> {
  const sessionType = process.env.XDG_SESSION_TYPE?.toLowerCase() || 'unknown'
  const desktop = process.env.XDG_CURRENT_DESKTOP || process.env.DESKTOP_SESSION || 'Unknown desktop'
  const hasXdotool = await commandExists('xdotool')
  const hasYdotool = await commandExists('ydotool')
  const hasGdbus = await commandExists('gdbus')

  const checks: CapabilityCheck[] = [
    {
      id: 'session',
      title: `Linux session: ${sessionType}`,
      status: sessionType === 'x11' ? 'ok' : 'limited',
      description: sessionType === 'x11'
        ? `Detected ${desktop} on X11. This is the most reliable Ubuntu setup for app-managed global shortcuts and automatic paste.`
        : `Detected ${desktop} on Wayland/unknown. Clipboard capture can work, but global shortcuts and automatic paste may be restricted by the compositor.`
    },
    {
      id: 'xdotool',
      title: 'xdotool for X11 auto-paste',
      status: hasXdotool ? 'ok' : sessionType === 'x11' ? 'missing' : 'recommended',
      description: 'Used to send Ctrl+V into the previously focused app on X11.',
      installCommand: 'sudo apt install xdotool'
    },
    {
      id: 'ydotool',
      title: 'ydotool for Wayland auto-paste',
      status: hasYdotool ? 'ok' : sessionType === 'wayland' ? 'missing' : 'recommended',
      description: 'Best-effort Wayland-compatible input simulation. It may require enabling and configuring the ydotool daemon.',
      installCommand: 'sudo apt install ydotool && sudo systemctl enable --now ydotool'
    },
    {
      id: 'gdbus',
      title: 'D-Bus tooling',
      status: hasGdbus ? 'ok' : 'recommended',
      description: 'Useful for future desktop portal/KDE/GNOME integrations and diagnostics.',
      installCommand: 'sudo apt install libglib2.0-bin'
    }
  ]

  const recommendation = sessionType === 'x11'
    ? 'For Ubuntu today, X11 + xdotool is the most reliable setup for full capabilities.'
    : 'For Ubuntu Wayland, ydotool is the best available auto-paste helper, but X11 + xdotool is still more reliable for full capabilities.'

  return {
    platform: process.platform,
    sessionType,
    recommendation,
    checks
  }
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync('sh', ['-c', `command -v ${command}`])
    return true
  } catch {
    return false
  }
}
