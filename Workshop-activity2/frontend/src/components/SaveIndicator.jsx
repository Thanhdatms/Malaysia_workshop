const LABELS = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved ✓',
  error: 'Could not save — check connection',
};

export default function SaveIndicator({ status }) {
  if (!status || status === 'idle') return <span className="save-indicator" />;
  return <span className={`save-indicator is-${status}`}>{LABELS[status]}</span>;
}
