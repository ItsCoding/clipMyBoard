import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, ClipboardEntry, StartupWizardInfo } from '../../shared/types'
import { EntryCard } from './EntryCard'
import { SearchBar } from './SearchBar'
import { StartupWizard } from './StartupWizard'

const filters = ['History', 'Pinned', 'Links', 'Images', 'Files'] as const
type Filter = typeof filters[number]

export function Drawer() {
  const [entries, setEntries] = useState<ClipboardEntry[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('History')
  const [activeIndex, setActiveIndex] = useState(0)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [wizardInfo, setWizardInfo] = useState<StartupWizardInfo | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [previewEntry, setPreviewEntry] = useState<ClipboardEntry | null>(null)

  const loadEntries = useCallback(async () => {
    const nextEntries = await window.clipmyboard.listEntries(query)
    setEntries(nextEntries)
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  useEffect(() => window.clipmyboard.onEntriesChanged(() => void loadEntries()), [loadEntries])

  useEffect(() => {
    async function loadStartupState() {
      const [nextSettings, nextWizardInfo] = await Promise.all([
        window.clipmyboard.getSettings(),
        window.clipmyboard.getStartupWizardInfo()
      ])

      setSettings(nextSettings)
      setWizardInfo(nextWizardInfo)

      if (!nextSettings.setupWizardCompleted) {
        setShowWizard(true)
        const completedSettings = await window.clipmyboard.updateSettings({ setupWizardCompleted: true })
        setSettings(completedSettings)
      }
    }

    void loadStartupState()
  }, [])

  const closeWizard = useCallback(async () => {
    const nextSettings = await window.clipmyboard.updateSettings({ setupWizardCompleted: true })
    setSettings(nextSettings)
    setShowWizard(false)
  }, [])

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filter === 'Pinned') return entry.isPinned
      if (filter === 'Links') return entry.kind === 'url'
      if (filter === 'Images') return entry.kind === 'image'
      if (filter === 'Files') return entry.kind === 'files'
      return true
    })
  }, [entries, filter])

  const paste = useCallback(async (id: string) => {
    await window.clipmyboard.pasteEntry(id)
  }, [])

  const toggleExpanded = useCallback(async () => {
    const next = !isExpanded
    setIsExpanded(next)
    await window.clipmyboard.setDrawerExpanded(next)
  }, [isExpanded])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void window.clipmyboard.hideDrawer()
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, Math.max(0, filteredEntries.length - 1)))
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => Math.max(0, index - 1))
      }

      if (event.key === 'Enter' && filteredEntries[activeIndex]) {
        event.preventDefault()
        void paste(filteredEntries[activeIndex].id)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, filteredEntries, paste])

  return (
    <main className={`drawer-shell ${isExpanded ? 'expanded' : 'compact'}`}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-dot" /> ClipMyBoard</div>
        <nav>
          {filters.map((item) => (
            <button key={item} className={item === filter ? 'selected' : ''} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </nav>
        <button className="clear" onClick={async () => { await window.clipmyboard.clearHistory(); await loadEntries() }}>Clear</button>
      </aside>

      <section className="content">
        <div className="topbar">
          <SearchBar value={query} onChange={setQuery} />
          <div className="hint">Click/Enter paste · Esc close · Shift+Ctrl+V open</div>
          <button className="toolbar-button" onClick={toggleExpanded}>{isExpanded ? 'Compact' : 'Extend'}</button>
        </div>

        <div className="entries">
          {filteredEntries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              active={index === activeIndex}
              index={index}
              onPaste={paste}
              onPreview={setPreviewEntry}
              onTogglePin={async (id) => { await window.clipmyboard.togglePin(id); await loadEntries() }}
              onDelete={async (id) => { await window.clipmyboard.deleteEntry(id); await loadEntries() }}
            />
          ))}
          {filteredEntries.length === 0 && <div className="empty">Copy something to start building history.</div>}
        </div>
      </section>

      {showWizard && wizardInfo && settings && (
        <StartupWizard info={wizardInfo} settings={settings} onClose={closeWizard} />
      )}

      {previewEntry && (
        <EntryPreview entry={previewEntry} onClose={() => setPreviewEntry(null)} onPaste={paste} />
      )}
    </main>
  )
}

function EntryPreview({ entry, onClose, onPaste }: { entry: ClipboardEntry; onClose: () => void; onPaste: (id: string) => void }) {
  return (
    <div className="preview-backdrop" onClick={onClose}>
      <section className="preview-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className={`kind ${entry.kind}`}>{entry.kind}</span>
            <h2>{entry.preview || 'Clipboard item'}</h2>
          </div>
          <div className="preview-actions">
            <button onClick={() => onPaste(entry.id)}>Paste</button>
            <button onClick={onClose}>Close</button>
          </div>
        </header>
        <PreviewBody entry={entry} />
      </section>
    </div>
  )
}

function PreviewBody({ entry }: { entry: ClipboardEntry }) {
  if (entry.kind === 'image' && entry.imagePath) {
    return <img className="large-image-preview" src={`file://${entry.imagePath}`} alt={entry.preview} />
  }

  if (entry.kind === 'files') {
    return <pre className="large-text-preview">{(entry.filePaths ?? []).join('\n')}</pre>
  }

  if (entry.kind === 'html' && entry.html) {
    return (
      <div className="large-preview-grid">
        <div className="large-html-preview" dangerouslySetInnerHTML={{ __html: entry.html }} />
        <pre className="large-text-preview">{entry.plainText || entry.preview}</pre>
      </div>
    )
  }

  return <pre className="large-text-preview">{entry.plainText || entry.preview}</pre>
}
