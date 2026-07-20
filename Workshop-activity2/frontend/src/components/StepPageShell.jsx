import TopBar from './TopBar';
import StepTrack from './StepTrack';

export default function StepPageShell({
  step,
  eyebrow,
  title,
  subtitle,
  topRight,
  wide,
  children,
  onBack,
  backLabel = 'Back',
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
}) {
  return (
    <div className="app-shell">
      <TopBar />
      <div className={`page ${wide ? 'page--wide' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h1 style={{ margin: '2px 0 4px' }}>{title}</h1>
            {subtitle && (
              <p className="muted" style={{ margin: 0 }}>
                {subtitle}
              </p>
            )}
          </div>
          {topRight}
        </div>

        <StepTrack current={step} />

        <div className="card step-card">
          {children}
          {(onBack || onNext) && (
            <div className="step-nav">
              {onBack ? (
                <button type="button" className="btn btn-secondary" onClick={onBack}>
                  {backLabel}
                </button>
              ) : (
                <span />
              )}
              {onNext && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onNext}
                  disabled={nextDisabled}
                >
                  {nextLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
