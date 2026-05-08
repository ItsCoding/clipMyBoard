import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export interface AppPaths {
  dataDir: string
  assetsDir: string
  databasePath: string
}

export function getAppPaths(): AppPaths {
  const dataDir = app.getPath('userData')
  const assetsDir = join(dataDir, 'assets')
  mkdirSync(assetsDir, { recursive: true })

  return {
    dataDir,
    assetsDir,
    databasePath: join(dataDir, 'history.json')
  }
}
