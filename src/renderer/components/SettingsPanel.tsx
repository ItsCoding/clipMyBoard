import { useEffect, useState } from 'react'
import type { AppSettings, DrawerAlignment } from '../../shared/types'

interface SettingsPanelProps {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
  onClose: () => void
}

const alignments: { value: DrawerAlignment; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'center', label: 'Center' },
  { value: 'cursor', label: 'At cursor' }
]

const themes: { value: AppSettings['theme']; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

const monitorTargets: { value: AppSettings['monitorTarget']; label: string }[] = [
  { value: 'cursor', label: 'Monitor with cursor' },
  { value: 'primary', label: 'Primary monitor' }
]

const accentSwatches = ['#4c8cff', '#6577ff', '#8757d6', '#21a56f', '#d78322', '#d9534f', '#0f9bb1']

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [shortcutCapture, setShortcutCapture] = useState(false)

  useEffect(() => setDraft(settings), [settings])

  const update = async (patch: Partial<AppSettings>): Promise<void> => {
    const next = { ...draft, ...patch }
    setDraft(next)
    const saved = await window.clipmyboard.updateSettings(patch)
    onChange(saved)
  }

  useEffect(() => {
    if (!shortcutCapture) return
    const handler = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const accelerator = toAccelerator(event)
      if (!accelerator) return
      setShortcutCapture(false)
      void update({ shortcut: accelerator })
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [shortcutCapture, draft])

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <section
        className="settings-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <header className="settings-header">
          <div>
            <p className="eyebrow">Preferences</p>
            <h1>Settings</h1>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings">×</button>
        </header>

        <div className="settings-grid">
          <Section title="Appearance">
            <Field label="Theme">
              <SegmentedControl
                value={draft.theme}
                options={themes}
                onSelect={(value) => update({ theme: value })}
              />
            </Field>
            <Field label="Accent color">
              <div className="swatch-row">
                {accentSwatches.map((color) => (
                  <button
                    key={color}
                    className={`swatch ${draft.accentColor === color ? 'selected' : ''}`}
                    style={{ background: color }}
                    onClick={() => update({ accentColor: color })}
                    aria-label={`Accent ${color}`}
                  />
                ))}
                <input
                  type="color"
                  value={draft.accentColor}
                  onChange={(event) => update({ accentColor: event.target.value })}
                  aria-label="Custom accent color"
                />
              </div>
            </Field>
            <Field label={`Opacity · ${Math.round(draft.opacity * 100)}%`}>
              <input
                type="range"
                min={50}
                max={100}
                value={Math.round(draft.opacity * 100)}
                onChange={(event) => update({ opacity: Number(event.target.value) / 100 })}
              />
            </Field>
            <Field label="Animations">
              <Toggle
                checked={draft.animationsEnabled}
                onChange={(checked) => update({ animationsEnabled: checked })}
              />
            </Field>
          </Section>

          <Section title="Layout">
            <Field label="Alignment">
              <SegmentedControl
                value={draft.alignment}
                options={alignments}
                onSelect={(value) => update({ alignment: value })}
              />
            </Field>
            <Field label="Monitor">
              <SegmentedControl
                value={draft.monitorTarget}
                options={monitorTargets}
                onSelect={(value) => update({ monitorTarget: value })}
              />
            </Field>
            <Field label={`Compact size · ${draft.compactWidthPercent}% × ${draft.compactHeightPercent}%`}>
              <div className="dual-range">
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={draft.compactWidthPercent}
                  onChange={(event) => update({ compactWidthPercent: Number(event.target.value) })}
                />
                <input
                  type="range"
                  min={20}
                  max={90}
                  value={draft.compactHeightPercent}
                  onChange={(event) => update({ compactHeightPercent: Number(event.target.value) })}
                />
              </div>
            </Field>
            <Field label={`Expanded size · ${draft.expandedWidthPercent}% × ${draft.expandedHeightPercent}%`}>
              <div className="dual-range">
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={draft.expandedWidthPercent}
                  onChange={(event) => update({ expandedWidthPercent: Number(event.target.value) })}
                />
                <input
                  type="range"
                  min={30}
                  max={95}
                  value={draft.expandedHeightPercent}
                  onChange={(event) => update({ expandedHeightPercent: Number(event.target.value) })}
                />
              </div>
            </Field>
          </Section>

          <Section title="Behavior">
            <Field label="Open shortcut">
              <button
                className={`shortcut-input ${shortcutCapture ? 'capturing' : ''}`}
                onClick={() => setShortcutCapture((value) => !value)}
              >
                {shortcutCapture ? 'Press keys…' : draft.shortcut}
              </button>
            </Field>
            <Field label="Monitor clipboard">
              <Toggle
                checked={draft.monitorClipboard}
                onChange={(checked) => update({ monitorClipboard: checked })}
              />
            </Field>
            <Field label="Launch at login">
              <Toggle
                checked={draft.launchAtLogin}
                onChange={(checked) => update({ launchAtLogin: checked })}
              />
            </Field>
            <Field label={`History size · ${draft.maxEntries} items`}>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={draft.maxEntries}
                onChange={(event) => update({ maxEntries: Number(event.target.value) })}
              />
            </Field>
          </Section>
        </div>
      </section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      <div className="settings-section-body">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <div>{children}</div>
    </label>
  )
}

function SegmentedControl<T extends string>({
  value,
  options,
  onSelect
}: {
  value: T
  options: { value: T; label: string }[]
  onSelect: (value: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          className={option.value === value ? 'selected' : ''}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      className={`toggle ${checked ? 'on' : 'off'}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span />
    </button>
  )
}

function toAccelerator(event: KeyboardEvent): string | null {
  const parts: string[] = []
  if (event.ctrlKey) parts.push('Control')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')
  if (event.metaKey) parts.push('Super')

  const key = event.key
  if (!key || key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return null

  const normalized = normalizeKey(key)
  if (!normalized) return null
  parts.push(normalized)

  if (parts.length < 2) return null
  return parts.join('+')
}

function normalizeKey(key: string): string | null {
  if (key.length === 1) return key.toUpperCase()
  const map: Record<string, string> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Escape: 'Esc',
    ' ': 'Space'
  }
  return map[key] ?? key
}
