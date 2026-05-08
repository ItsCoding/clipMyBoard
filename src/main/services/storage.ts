import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { nanoid } from 'nanoid'
import type { AppSettings, CaptureCandidate, ClipboardEntry } from '../../shared/types'
import { calculateByteSize, createPreview, detectKind, hashCandidate } from '../../shared/normalize'
import { defaultSettings } from '../../shared/defaults'

interface StoreFile {
  version: 1
  entries: ClipboardEntry[]
  settings: AppSettings
}

export class StorageService {
  private store: StoreFile

  constructor(private readonly databasePath: string) {
    this.store = this.load()
  }

  listEntries(query = ''): ClipboardEntry[] {
    const normalizedQuery = query.trim().toLowerCase()
    return this.store.entries
      .filter((entry) => {
        if (!normalizedQuery) return true
        return [entry.preview, entry.plainText, entry.html, ...(entry.filePaths ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 80)
  }

  getEntry(id: string): ClipboardEntry | null {
    return this.store.entries.find((entry) => entry.id === id) ?? null
  }

  saveCandidate(candidate: CaptureCandidate, imagePath?: string): ClipboardEntry | null {
    const kind = detectKind(candidate)
    const normalized = { ...candidate, kind }
    const byteSize = calculateByteSize(normalized)
    const settings = this.getSettings()

    if (byteSize > settings.maxEntryBytes || this.matchesSecretPattern(normalized.plainText ?? '', settings.secretPatterns)) {
      return null
    }

    const hash = hashCandidate(normalized)
    const existing = this.store.entries.find((entry) => entry.hash === hash)
    const now = new Date().toISOString()

    if (existing) {
      existing.createdAt = now
      existing.updatedAt = now
      this.persist()
      return existing
    }

    const entry: ClipboardEntry = {
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
      kind,
      plainText: normalized.plainText,
      html: normalized.html,
      imagePath,
      filePaths: normalized.filePaths,
      preview: createPreview(normalized),
      hash,
      isPinned: false,
      tags: [],
      byteSize
    }

    this.store.entries.unshift(entry)
    this.enforceRetention(settings.maxEntries)
    this.persist()
    return entry
  }

  deleteEntry(id: string): void {
    this.store.entries = this.store.entries.filter((entry) => entry.id !== id)
    this.persist()
  }

  togglePin(id: string): ClipboardEntry | null {
    const entry = this.getEntry(id)
    if (!entry) return null
    entry.isPinned = !entry.isPinned
    entry.updatedAt = new Date().toISOString()
    this.persist()
    return entry
  }

  clearHistory(): void {
    this.store.entries = this.store.entries.filter((entry) => entry.isPinned)
    this.persist()
  }

  getSettings(): AppSettings {
    return { ...defaultSettings, ...this.store.settings }
  }

  updateSettings(patch: Partial<AppSettings>): AppSettings {
    this.store.settings = { ...this.getSettings(), ...patch }
    this.persist()
    return this.getSettings()
  }

  private load(): StoreFile {
    if (!existsSync(this.databasePath)) {
      return { version: 1, entries: [], settings: defaultSettings }
    }

    try {
      const parsed = JSON.parse(readFileSync(this.databasePath, 'utf8')) as Partial<StoreFile>
      return {
        version: 1,
        entries: parsed.entries ?? [],
        settings: { ...defaultSettings, ...parsed.settings }
      }
    } catch {
      return { version: 1, entries: [], settings: defaultSettings }
    }
  }

  private persist(): void {
    writeFileSync(this.databasePath, JSON.stringify(this.store, null, 2))
  }

  private enforceRetention(maxEntries: number): void {
    const pinned = this.store.entries.filter((entry) => entry.isPinned)
    const rest = this.store.entries.filter((entry) => !entry.isPinned).slice(0, maxEntries)
    this.store.entries = [...pinned, ...rest]
  }

  private matchesSecretPattern(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      try {
        return new RegExp(pattern).test(text)
      } catch {
        return false
      }
    })
  }
}
