#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync, chmodSync, readdirSync, statSync, copyFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { homedir, platform } from 'node:os'

const projectRoot = resolve(new URL('..', import.meta.url).pathname)
const appName = 'ClipMyBoard'
const appId = 'dev.clipmyboard.app'
const oldAppName = 'ClipMyAss'
const oldAppId = 'dev.clipmyass.app'
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const noLaunch = args.has('--no-launch') || dryRun

if (process.env.npm_lifecycle_event === 'install' && process.env.npm_command !== 'run') {
  console.log('Skipping app install during dependency installation. Use `npm run install` to install ClipMyBoard.')
  process.exit(0)
}

const runner = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

async function main() {
  console.log(`${dryRun ? '[dry-run] ' : ''}Installing ${appName} for ${platform()}...`)

  run(runner, ['run', 'build'])
  run(npx, ['electron-builder', '--dir', `--${electronBuilderPlatform()}`])

  if (process.platform === 'linux') installLinux()
  else if (process.platform === 'darwin') installMac()
  else if (process.platform === 'win32') installWindows()
  else throw new Error(`Unsupported platform: ${process.platform}`)

  console.log(`${appName} installed and autostart configured.`)
}

function installLinux() {
  const sourceDir = join(projectRoot, 'release', 'linux-unpacked')
  assertExists(sourceDir, 'Linux unpacked build was not created.')

  const installDir = join(homedir(), '.local', 'opt', appName)
  const binDir = join(homedir(), '.local', 'bin')
  const desktopDir = join(homedir(), '.local', 'share', 'applications')
  const autostartDir = join(homedir(), '.config', 'autostart')
  const desktopPath = join(desktopDir, `${appId}.desktop`)
  const autostartPath = join(autostartDir, `${appId}.desktop`)
  const symlinkPath = join(binDir, 'clipmyboard')

  killRunningInstances()
  cleanupLinuxLegacyInstall()
  remove(installDir)
  replaceDir(sourceDir, installDir)
  const exePath = dryRun ? join(installDir, 'clipmyboard') : findLinuxExecutable(installDir)
  chmod(exePath, 0o755)

  mkdir(binDir)
  remove(symlinkPath)
  link(exePath, symlinkPath)

  const desktopFile = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${appName}`,
    'Comment=Cross-platform clipboard manager',
    `Exec=${quoteDesktopExec(exePath)}`,
    'Terminal=false',
    'Categories=Utility;Productivity;',
    `StartupWMClass=${appName}`,
    'X-GNOME-Autostart-enabled=true',
    ''
  ].join('\n')

  mkdir(desktopDir)
  mkdir(autostartDir)
  write(desktopPath, desktopFile)
  write(autostartPath, desktopFile)

  if (!noLaunch) detached(exePath, [])

  console.log(`Installed to: ${installDir}`)
  console.log(`Command: ${symlinkPath}`)
  console.log(`Autostart: ${autostartPath}`)
}

function installMac() {
  const sourceApp = join(projectRoot, 'release', 'mac', `${appName}.app`)
  assertExists(sourceApp, 'macOS app bundle was not created.')

  const applicationsDir = join(homedir(), 'Applications')
  const targetApp = join(applicationsDir, `${appName}.app`)
  const agentsDir = join(homedir(), 'Library', 'LaunchAgents')
  const plistPath = join(agentsDir, `${appId}.plist`)

  mkdir(applicationsDir)
  killRunningInstances()
  cleanupMacLegacyInstall()
  remove(targetApp)
  if (!dryRun) replaceDir(sourceApp, targetApp)
  else console.log(`copy ${sourceApp} -> ${targetApp}`)

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${appId}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/open</string>
    <string>-a</string>
    <string>${targetApp}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
`

  mkdir(agentsDir)
  write(plistPath, plist)
  run('launchctl', ['unload', plistPath], { allowFailure: true })
  run('launchctl', ['load', plistPath], { allowFailure: true })

  if (!noLaunch) detached('open', ['-a', targetApp])

  console.log(`Installed to: ${targetApp}`)
  console.log(`Autostart: ${plistPath}`)
}

function installWindows() {
  const sourceDir = join(projectRoot, 'release', 'win-unpacked')
  assertExists(sourceDir, 'Windows unpacked build was not created.')

  const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
  const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
  const installDir = join(localAppData, 'Programs', appName)
  const exePath = join(installDir, `${appName}.exe`)
  const startupShortcut = join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', `${appName}.lnk`)
  const startMenuDir = join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs')
  const startMenuShortcut = join(startMenuDir, `${appName}.lnk`)

  killRunningInstances()
  cleanupWindowsLegacyInstall(localAppData, appData)
  remove(installDir)
  replaceDir(sourceDir, installDir)
  if (!dryRun) assertExists(exePath, 'Installed Windows executable was not found.')
  createWindowsShortcut(exePath, startupShortcut)
  createWindowsShortcut(exePath, startMenuShortcut)

  if (!noLaunch) detached(exePath, [])

  console.log(`Installed to: ${installDir}`)
  console.log(`Autostart: ${startupShortcut}`)
}

function createWindowsShortcut(targetPath, shortcutPath) {
  const ps = [
    '$WScriptShell = New-Object -ComObject WScript.Shell',
    `$Shortcut = $WScriptShell.CreateShortcut(${psQuote(shortcutPath)})`,
    `$Shortcut.TargetPath = ${psQuote(targetPath)}`,
    `$Shortcut.WorkingDirectory = ${psQuote(dirname(targetPath))}`,
    '$Shortcut.Save()'
  ].join('; ')

  run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps])
}

function electronBuilderPlatform() {
  if (process.platform === 'linux') return 'linux'
  if (process.platform === 'darwin') return 'mac'
  if (process.platform === 'win32') return 'win'
  return process.platform
}

function findLinuxExecutable(installDir) {
  const candidates = ['clipmyboard', appName, appName.toLowerCase()].map((name) => join(installDir, name))
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  for (const name of readdirSync(installDir)) {
    const path = join(installDir, name)
    if (statSync(path).isFile() && !name.includes('.') && name !== 'chrome-sandbox') return path
  }

  throw new Error(`Could not find Linux executable in ${installDir}`)
}

function killRunningInstances() {
  const targets = [appName, appName.toLowerCase(), 'clipmyboard', oldAppName, oldAppName.toLowerCase(), 'clipmyass']
  const unique = Array.from(new Set(targets))

  if (process.platform === 'linux' || process.platform === 'darwin') {
    for (const name of unique) {
      run('pkill', ['-f', name], { allowFailure: true, quiet: true })
    }
  } else if (process.platform === 'win32') {
    for (const name of unique) {
      run('taskkill', ['/IM', `${name}.exe`, '/F'], { allowFailure: true, quiet: true })
    }
  }
}

function cleanupLinuxLegacyInstall() {
  remove(join(homedir(), '.local', 'opt', oldAppName))
  remove(join(homedir(), '.local', 'bin', 'clipmyass'))
  remove(join(homedir(), '.local', 'share', 'applications', `${oldAppId}.desktop`))
  remove(join(homedir(), '.config', 'autostart', `${oldAppId}.desktop`))
}

function cleanupMacLegacyInstall() {
  remove(join(homedir(), 'Applications', `${oldAppName}.app`))
  remove(join(homedir(), 'Library', 'LaunchAgents', `${oldAppId}.plist`))
}

function cleanupWindowsLegacyInstall(localAppData, appData) {
  remove(join(localAppData, 'Programs', oldAppName))
  remove(join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', `${oldAppName}.lnk`))
  remove(join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', `${oldAppName}.lnk`))
}

function run(command, commandArgs, options = {}) {
  console.log(`$ ${command} ${commandArgs.join(' ')}`)
  if (dryRun) return

  const result = spawnSync(command, commandArgs, {
    cwd: projectRoot,
    stdio: options.quiet ? 'ignore' : 'inherit',
    shell: false
  })

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(' ')}`)
  }
}

function detached(command, commandArgs) {
  if (dryRun) return
  const child = spawn(command, commandArgs, {
    detached: true,
    stdio: 'ignore'
  })
  child.unref()
}

function replaceDir(source, target) {
  remove(target)
  mkdir(dirname(target))
  if (!dryRun) copyDir(source, target)
  else console.log(`copy ${source} -> ${target}`)
}

function copyDir(source, target) {
  mkdirSync(target, { recursive: true })
  for (const item of readdirSync(source)) {
    const sourcePath = join(source, item)
    const targetPath = join(target, item)
    const stats = statSync(sourcePath)

    if (stats.isDirectory()) copyDir(sourcePath, targetPath)
    else if (stats.isSymbolicLink()) symlinkSync(sourcePath, targetPath)
    else copyFileSync(sourcePath, targetPath)
  }
}

function mkdir(path) {
  if (!dryRun) mkdirSync(path, { recursive: true })
  else console.log(`mkdir -p ${path}`)
}

function remove(path) {
  if (!existsSync(path)) return
  if (!dryRun) rmSync(path, { recursive: true, force: true })
  else console.log(`remove ${path}`)
}

function write(path, content) {
  if (!dryRun) writeFileSync(path, content)
  else console.log(`write ${path}`)
}

function chmod(path, mode) {
  if (!dryRun) chmodSync(path, mode)
  else console.log(`chmod ${mode.toString(8)} ${path}`)
}

function link(target, path) {
  if (!dryRun) symlinkSync(target, path)
  else console.log(`ln -s ${target} ${path}`)
}

function assertExists(path, message) {
  if (!existsSync(path) && !dryRun) throw new Error(message)
}

function quoteDesktopExec(value) {
  return `"${value.replaceAll('"', '\\"')}"`
}

function psQuote(value) {
  return `'${value.replaceAll("'", "''")}'`
}
