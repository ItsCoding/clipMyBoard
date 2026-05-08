import type { AppSettings, StartupWizardInfo } from '../../shared/types'

interface StartupWizardProps {
  info: StartupWizardInfo
  settings: AppSettings
  onClose: () => void
}

export function StartupWizard({ info, onClose }: StartupWizardProps) {
  const missing = info.checks.filter((check) => check.status === 'missing')

  return (
    <div className="wizard-backdrop">
      <section className="wizard-panel" role="dialog" aria-modal="true" aria-label="Startup setup wizard">
        <header className="wizard-header">
          <div>
            <p className="eyebrow">First run setup</p>
            <h1>Clipboard capabilities</h1>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close setup wizard">×</button>
        </header>

        <p className="wizard-recommendation">{info.recommendation}</p>

        <div className="capability-list">
          {info.checks.map((check) => (
            <article key={check.id} className={`capability ${check.status}`}>
              <div>
                <h2>{check.title}</h2>
                <p>{check.description}</p>
                {check.installCommand && check.status !== 'ok' && (
                  <code>{check.installCommand}</code>
                )}
              </div>
              <span>{labelFor(check.status)}</span>
            </article>
          ))}
        </div>

        <footer className="wizard-actions">
          {missing.length > 0 && <p>{missing.length} missing item{missing.length === 1 ? '' : 's'} for full auto-paste support.</p>}
          <button onClick={onClose}>Continue</button>
        </footer>
      </section>
    </div>
  )
}

function labelFor(status: StartupWizardInfo['checks'][number]['status']): string {
  if (status === 'ok') return 'OK'
  if (status === 'missing') return 'Missing'
  if (status === 'limited') return 'Limited'
  return 'Recommended'
}
