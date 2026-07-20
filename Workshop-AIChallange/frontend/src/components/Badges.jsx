const AI_LABEL = { yes: 'Yes', partial: 'Partial', no: 'No' };
const STATUS_LABEL = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
};

export function AiPill({ value }) {
  if (!value) return <span className="pill pill-neutral">Not answered</span>;
  return <span className={`pill pill-${value}`}>{AI_LABEL[value] || value}</span>;
}

export function StatusBadge({ status }) {
  const s = status || 'not_started';
  return <span className={`status-badge status-${s}`}>{STATUS_LABEL[s] || s}</span>;
}
