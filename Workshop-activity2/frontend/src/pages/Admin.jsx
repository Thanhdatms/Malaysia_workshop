import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { getAdminOverview } from '../api/client';
import ProcessStepTable from '../components/ProcessStepTable';
import EvaluateTable from '../components/EvaluateTable';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';

function AdminLogin({ onSubmit, loading, error }) {
  const [token, setToken] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(token);
  }

  return (
    <div className="app-shell">
      <div className="page page--narrow" style={{ paddingTop: '14vh' }}>
        <div className="card">
          <div className="eyebrow">Facilitator Access</div>
          <h1>Admin Dashboard</h1>
          <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
            <label htmlFor="admin-token">Admin token</label>
            <input
              id="admin-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter facilitator token"
              autoFocus
            />
            {error && (
              <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 16 }}
              disabled={loading}
            >
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TeamCard({ entry, onClick }) {
  const { team, steps, workflow } = entry;
  return (
    <div
      className="card question-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="question-card__top">
        <div>
          <span className="eyebrow">{team.department || 'No department set'}</span>
          <h2 style={{ margin: '4px 0' }}>{team.name}</h2>
        </div>
        {team.submitted_at ? (
          <span className="status-badge status-done">Submitted</span>
        ) : (
          <span className="status-badge status-in_progress">In progress</span>
        )}
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {steps.length} step{steps.length === 1 ? '' : 's'} mapped · {workflow.nodes.length} workflow
        node{workflow.nodes.length === 1 ? '' : 's'}
      </p>
      <p className="muted" style={{ margin: 0, fontSize: '0.78rem' }}>
        Last active {new Date(team.last_active_at).toLocaleString()}
      </p>
    </div>
  );
}

function TeamDetail({ entry, onBack }) {
  const { team, steps, workflow } = entry;

  const mapSteps = steps.map((s) => ({
    id: s.id,
    order_index: s.order_index,
    step_name: s.step_name,
    owner: s.owner,
    time_per_step: s.time_per_step,
    problem: s.problem,
    risk: s.risk,
  }));

  const evaluateRows = steps.map((s) => ({
    process_step_id: s.id,
    step_name: s.step_name || `Step ${s.order_index + 1}`,
    data_needed: s.evaluate?.data_needed || '',
    ai_agent: s.evaluate?.ai_agent || '',
    human_in_the_loop: s.evaluate?.human_in_the_loop || false,
    notes_for_design: s.evaluate?.notes_for_design || '',
  }));

  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onBack}
        style={{ marginBottom: 16 }}
      >
        ← Back to teams
      </button>

      <div className="question-card__top">
        <div>
          <span className="eyebrow">{team.department || 'No department set'}</span>
          <h1 style={{ margin: '4px 0' }}>{team.name}</h1>
        </div>
        {team.submitted_at ? (
          <span className="status-badge status-done">
            Submitted {new Date(team.submitted_at).toLocaleString()}
          </span>
        ) : (
          <span className="status-badge status-in_progress">In progress</span>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Step 1 &amp; 2 · Map &amp; Identify</h2>
        {mapSteps.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No process steps mapped yet.</p>
        ) : (
          <ProcessStepTable steps={mapSteps} mode="identify" readOnly />
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Step 3 · Evaluate</h2>
        {evaluateRows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No steps evaluated yet.</p>
        ) : (
          <EvaluateTable rows={evaluateRows} readOnly />
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Step 4 · Design</h2>
        {workflow.nodes.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No workflow diagram yet.</p>
        ) : (
          <ReactFlowProvider>
            <WorkflowCanvas initialNodes={workflow.nodes} initialEdges={workflow.edges} readOnly />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  async function handleLogin(candidateToken) {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminOverview(candidateToken);
      setOverview(res);
      setToken(candidateToken);
    } catch (err) {
      setError(err.message || 'Invalid token.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setOverview(null);
    setSelectedTeamId(null);
  }

  if (!token || !overview) {
    return <AdminLogin onSubmit={handleLogin} loading={loading} error={error} />;
  }

  const selectedEntry = overview.teams.find((entry) => entry.team.id === selectedTeamId);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__brand">
          <span className="top-bar__logo-dot" />
          AI Workflow Designer — Facilitator Admin
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <div className="page page--wide">
        {selectedEntry ? (
          <TeamDetail entry={selectedEntry} onBack={() => setSelectedTeamId(null)} />
        ) : (
          <>
            <div className="eyebrow">Facilitator</div>
            <h1>All Teams</h1>
            <p className="muted">
              Click a team to see their full Map, Identify, Evaluate and Design results.
            </p>
            {overview.teams.length === 0 ? (
              <p className="muted">No teams have joined yet.</p>
            ) : (
              <div className="grid grid-cols-2" style={{ marginTop: 20 }}>
                {overview.teams.map((entry) => (
                  <TeamCard
                    key={entry.team.id}
                    entry={entry}
                    onClick={() => setSelectedTeamId(entry.team.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
