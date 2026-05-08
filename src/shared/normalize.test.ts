import { describe, expect, it } from 'vitest'
import { createPreview, detectKind, looksLikeFileList } from './normalize'

describe('normalize clipboard candidates', () => {
  it('detects urls', () => {
    expect(detectKind({ kind: 'text', plainText: 'https://example.com' })).toBe('url')
  })

  it('detects files from explicit paths', () => {
    expect(detectKind({ kind: 'text', filePaths: ['/tmp/a.txt'] })).toBe('files')
  })

  it('creates compact previews', () => {
    expect(createPreview({ kind: 'html', html: '<b>Hello</b> world' })).toBe('Hello world')
  })

  it('detects path lists', () => {
    expect(looksLikeFileList('/tmp/a.txt\n/home/me/b.png')).toEqual(['/tmp/a.txt', '/home/me/b.png'])
  })
})
