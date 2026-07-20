import { Fragment, useState } from 'react';
import { getAdminOverview, adminExportUrl } from '../api/client';
import { AiPill, StatusBadge } from '../components/Badges';

export default function Admin() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [expanded, setExpanded] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await getAdminOverview(token);
      setData(res);
      setAuthed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await getAdminOverview(token);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openTeam(teamName) {
    setExpanded(null);
    setSelectedTeam(teamName);
  }

  if (!authed) {
    return (
      <div className="page page--narrow" style={{ paddingTop: '10vh' }}>
        <div className="card">
          <div className="eyebrow">Facilitator Access</div>
          <h1>Admin Dashboard</h1>
          <form onSubmit={handleLogin}>
            <label htmlFor="token">Admin token</label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter facilitator token"
              autoFocus
            />
            {error && (
              <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>
            )}
            <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={loading}>
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const rows = data?.rows || [];
  const teams = data?.teams || [];
  const questionCount = data?.questions?.length || 0;

  const teamStats = teams.map((t) => {
    const teamRows = rows.filter((r) => r.team === t.name);
    const submitted = teamRows.filter((r) => r.status === 'submitted').length;
    const inProgress = teamRows.filter((r) => r.status === 'in_progress').length;
    return { ...t, submitted, inProgress, total: questionCount || teamRows.length };
  });

  const exportBtn = (
    <a className="btn btn-primary" href={adminExportUrl(token)}>
      Export CSV (All Teams)
    </a>
  );

  if (!selectedTeam) {
    return (
      <div className="page" style={{ maxWidth: 1300 }}>
        <div className="eyebrow">Facilitator View</div>
        <h1>All Teams</h1>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          {exportBtn}
        </div>

        {teamStats.length === 0 ? (
          <p className="muted">No teams have joined yet.</p>
        ) : (
          <div className="grid grid-cols-3">
            {teamStats.map((t) => (
              <div key={t.id} className="card question-card" onClick={() => openTeam(t.name)}>
                <h3 style={{ margin: 0 }}>{t.name}</h3>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--navy)' }}>
                  {t.submitted} / {t.total} submitted
                </p>
                {t.inProgress > 0 && (
                  <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                    {t.inProgress} in progress
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const teamRows = rows.filter((r) => r.team === selectedTeam);

  return (
    <div className="page" style={{ maxWidth: 1300 }}>
      <div className="eyebrow">Facilitator View</div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>{selectedTeam}</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setSelectedTeam(null)}>
            &larr; All teams
          </button>
          {exportBtn}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto', marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Dept</th>
              <th>Correct?</th>
              <th>Team said</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teamRows.map((r) => {
              const key = r.question_id;
              const isOpen = expanded === key;
              return (
                <Fragment key={key}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : key)}>
                    <td>{r.question_title}</td>
                    <td>{r.department}</td>
                    <td><AiPill value={r.correct_ai_applicable} /></td>
                    <td><AiPill value={r.team_ai_applicable_answer} /></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="muted">{isOpen ? 'Hide ▲' : 'View ▼'}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} style={{ background: '#fafcfd' }}>
                        <DetailPanel row={r} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailPanel({ row }) {
  return (
    <div style={{ display: 'grid', gap: 12, padding: '8px 4px' }}>
      {row.ai_applicable_reasoning && (
        <Field label="AI-applicable reasoning" text={row.ai_applicable_reasoning} />
      )}
      <div className="compare-columns">
        <Field label="Normal prompt" text={row.normal_prompt_text} />
        <Field label="Template prompt" text={row.template_prompt_text} />
      </div>
      <div className="compare-columns">
        <Field label="Normal prompt result" text={row.normal_prompt_result} />
        <Field label="Template prompt result" text={row.template_prompt_result} />
      </div>
    </div>
  );
}

function Field({ label, text }) {
  return (
    <div>
      <label>{label}</label>
      <div className="template-box" style={{ borderStyle: 'solid' }}>
        {text || <span className="muted">(empty)</span>}
      </div>
    </div>
  );
}
