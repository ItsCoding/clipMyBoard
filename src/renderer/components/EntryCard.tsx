import type { ClipboardEntry } from '../../shared/types'

interface EntryCardProps {
  entry: ClipboardEntry
  active: boolean
  index: number
  onPaste: (id: string) => void
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
}

const labels: Record<ClipboardEntry['kind'], string> = {
  text: 'Text',
  url: 'Link',
  html: 'HTML',
  image: 'Image',
  files: 'Files'
}

export function EntryCard({ entry, active, index, onPaste, onTogglePin, onDelete }: EntryCardProps) {
  return (
    <article className={`entry-card ${active ? 'active' : ''}`} onClick={() => onPaste(entry.id)}>
      <header>
        <span className={`kind ${entry.kind}`}>{labels[entry.kind]}</span>
        <button title="Pin" onClick={(event) => { event.stopPropagation(); onTogglePin(entry.id) }}>{entry.isPinned ? '●' : '○'}</button>
      </header>

      <Preview entry={entry} />

      <footer>
        <span>#{index + 1}</span>
        <time>{relativeTime(entry.createdAt)}</time>
        <button title="Delete" onClick={(event) => { event.stopPropagation(); onDelete(entry.id) }}>×</button>
      </footer>
    </article>
  )
}

function Preview({ entry }: { entry: ClipboardEntry }) {
  if (entry.kind === 'image' && entry.imagePath) {
    return <img className="image-preview" src={`file://${entry.imagePath}`} alt={entry.preview} />
  }

  if (entry.kind === 'files') {
    return (
      <ul className="file-preview">
        {(entry.filePaths ?? []).slice(0, 4).map((path) => <li key={path}>{path.split(/[\\/]/).pop()}</li>)}
      </ul>
    )
  }

  if (entry.kind === 'html') {
    return <div className="text-preview html-preview" dangerouslySetInnerHTML={{ __html: entry.html ?? entry.preview }} />
  }

  return <p className="text-preview">{entry.preview}</p>
}

function relativeTime(value: string): string {
  const delta = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.round(delta / 60_000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
