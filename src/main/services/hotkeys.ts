import { globalShortcut } from 'electron'

export class HotkeyService {
  private registered: string | null = null

  register(accelerator: string, callback: () => void): boolean {
    this.unregister()
    const ok = globalShortcut.register(accelerator, callback)
    this.registered = ok ? accelerator : null
    return ok
  }

  unregister(): void {
    if (this.registered) globalShortcut.unregister(this.registered)
    this.registered = null
  }

  dispose(): void {
    globalShortcut.unregisterAll()
    this.registered = null
  }
}
