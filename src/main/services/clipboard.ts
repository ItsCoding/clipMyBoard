import { clipboard, nativeImage } from 'electron'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CaptureCandidate, ClipboardEntry } from '../../shared/types'
import { hashCandidate, looksLikeFileList } from '../../shared/normalize'
import type { StorageService } from './storage'

export class ClipboardMonitor {
  private timer: NodeJS.Timeout | null = null
  private lastHash = ''
  private paused = false

  constructor(
    private readonly storage: StorageService,
    private readonly assetsDir: string,
    private readonly onEntry: (entry: ClipboardEntry) => void
  ) {}

  start(): void {
    if (this.timer) return
    mkdirSync(this.assetsDir, { recursive: true })
    this.timer = setInterval(() => this.capture(), 850)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  setPaused(paused: boolean): void {
    this.paused = paused
  }

  capture(): void {
    if (this.paused || !this.storage.getSettings().monitorClipboard) return

    const candidate = this.readClipboard()
    if (!candidate) return

    const hash = hashCandidate(candidate)
    if (hash === this.lastHash) return
    this.lastHash = hash

    const imagePath = this.persistImage(candidate)
    const entry = this.storage.saveCandidate(candidate, imagePath)
    if (entry) this.onEntry(entry)
  }

  writeEntry(entry: ClipboardEntry): void {
    this.paused = true

    try {
      if (entry.kind === 'image' && entry.imagePath && existsSync(entry.imagePath)) {
        clipboard.writeImage(nativeImage.createFromPath(entry.imagePath))
      } else if (entry.kind === 'html' && entry.html) {
        clipboard.write({ text: entry.plainText ?? entry.preview, html: entry.html })
      } else if (entry.kind === 'files' && entry.filePaths?.length) {
        clipboard.writeText(entry.filePaths.join('\n'))
      } else {
        clipboard.writeText(entry.plainText ?? entry.preview)
      }
    } finally {
      setTimeout(() => {
        this.paused = false
      }, 500)
    }
  }

  private readClipboard(): CaptureCandidate | null {
    const text = clipboard.readText().trim()
    const html = clipboard.readHTML().trim()
    const image = clipboard.readImage()
    const filePaths = text ? looksLikeFileList(text) : []

    if (filePaths.length) {
      return { kind: 'files', plainText: text, filePaths }
    }

    if (!image.isEmpty()) {
      return { kind: 'image', plainText: text || undefined, html: html || undefined, imagePng: image.toPNG() }
    }

    if (html) {
      return { kind: 'html', plainText: text || undefined, html }
    }

    if (text) {
      return { kind: 'text', plainText: text }
    }

    return null
  }

  private persistImage(candidate: CaptureCandidate): string | undefined {
    if (!candidate.imagePng?.byteLength) return undefined
    const hash = hashCandidate(candidate)
    const imagePath = join(this.assetsDir, `${hash}.png`)
    if (!existsSync(imagePath)) writeFileSync(imagePath, candidate.imagePng)
    return imagePath
  }
}
