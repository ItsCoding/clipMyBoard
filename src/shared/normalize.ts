import { createHash } from 'node:crypto'
import type { CaptureCandidate, ClipboardEntryKind } from './types'

const urlPattern = /^https?:\/\/\S+$/i

export function detectKind(candidate: CaptureCandidate): ClipboardEntryKind {
  if (candidate.filePaths?.length) return 'files'
  if (candidate.imagePng?.byteLength) return 'image'
  if (candidate.html?.trim()) return 'html'
  const text = candidate.plainText?.trim() ?? ''
  return urlPattern.test(text) ? 'url' : 'text'
}

export function createPreview(candidate: CaptureCandidate): string {
  if (candidate.filePaths?.length) {
    return candidate.filePaths.map((path) => path.split(/[\\/]/).pop() || path).join(', ')
  }

  if (candidate.imagePng?.byteLength) {
    return `Image ${(candidate.imagePng.byteLength / 1024).toFixed(1)} KB`
  }

  const source = candidate.plainText || stripHtml(candidate.html || '') || 'Clipboard item'
  return source.replace(/\s+/g, ' ').trim().slice(0, 280)
}

export function calculateByteSize(candidate: CaptureCandidate): number {
  return Buffer.byteLength(candidate.plainText ?? '') +
    Buffer.byteLength(candidate.html ?? '') +
    (candidate.imagePng?.byteLength ?? 0) +
    Buffer.byteLength(JSON.stringify(candidate.filePaths ?? []))
}

export function hashCandidate(candidate: CaptureCandidate): string {
  const hash = createHash('sha256')
  hash.update(candidate.kind ?? detectKind(candidate))
  hash.update(candidate.plainText ?? '')
  hash.update(candidate.html ?? '')
  hash.update(candidate.imagePng ?? Buffer.alloc(0))
  hash.update(JSON.stringify(candidate.filePaths ?? []))
  return hash.digest('hex')
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export function looksLikeFileList(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []
  const likelyPaths = lines.filter((line) => /^(file:\/\/|[a-zA-Z]:\\|\/|~\/)/.test(line))
  return likelyPaths.length === lines.length ? likelyPaths.map((line) => line.replace(/^file:\/\//, '')) : []
}
