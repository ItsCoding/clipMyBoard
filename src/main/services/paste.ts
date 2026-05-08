import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { app } from 'electron'

const execFileAsync = promisify(execFile)

export async function pasteIntoFocusedApp(): Promise<boolean> {
  await delay(120)

  if (process.platform === 'linux') return pasteLinux()
  if (process.platform === 'darwin') return pasteMac()
  if (process.platform === 'win32') return pasteWindows()

  return false
}

async function pasteLinux(): Promise<boolean> {
  if (await commandExists('ydotool')) {
    await execFileAsync('ydotool', ['key', '29:1', '47:1', '47:0', '29:0'])
    return true
  }

  if (process.env.XDG_SESSION_TYPE?.toLowerCase() !== 'wayland' && await commandExists('xdotool')) {
    await execFileAsync('xdotool', ['key', 'ctrl+v'])
    return true
  }

  return false
}

async function pasteMac(): Promise<boolean> {
  if (!app.isAccessibilitySupportEnabled()) return false
  await execFileAsync('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down'])
  return true
}

async function pasteWindows(): Promise<boolean> {
  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('^v')"
    ])
    return true
  } catch {
    return false
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
