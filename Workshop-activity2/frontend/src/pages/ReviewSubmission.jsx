import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import WorkspaceShell from '../components/WorkspaceShell';
import ProcessStepTable from '../components/ProcessStepTable';
import EvaluateTable, { buildEvaluateRows } from '../components/EvaluateTable';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import { useTeam } from '../context/TeamContext';

export default function ReviewSubmission() {
  const { team, processSteps, evaluateSteps, workflow, submitTeam } = useTeam();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const evaluateRows = buildEvaluateRows(processSteps, evaluateSteps);

  async function handleConfirm() {
    setSubmitting(true);
    setError('');
    try {
      await submitTeam();
      navigate('/workspace/done');
    } catch (err) {
      setError(err.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkspaceShell wide>
      <div className="eyebrow">Review Before Submitting</div>
      <h1 style={{ margin: '2px 0 4px' }}>Check Your Team's Results</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Review everything below, then confirm to submit {team ? `${team.name}'s` : "your team's"}{' '}
        workflow.
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Step 1 &amp; 2 · Map &amp; Identify</h2>
        {processSteps.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No process steps mapped yet.</p>
        ) : (
          <ProcessStepTable steps={processSteps} mode="identify" readOnly />
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Step 3 · Design — Evaluate AI Applicability</h2>
        {evaluateRows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No steps evaluated yet.</p>
        ) : (
          <EvaluateTable rows={evaluateRows} readOnly />
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Step 3 · Design — Workflow Diagram</h2>
        {workflow.nodes.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No workflow diagram yet.</p>
        ) : (
          <ReactFlowProvider>
            <WorkflowCanvas
              initialNodes={workflow.nodes}
              initialEdges={workflow.edges}
              readOnly
              compact
            />
          </ReactFlowProvider>
        )}
      </div>

      {error && <p style={{ color: 'var(--red)', marginTop: 12 }}>{error}</p>}

      <div className="step-nav" style={{ borderTop: 'none', paddingTop: 4, marginTop: 20 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/workspace/analysis')}
        >
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Confirm & Submit'}
        </button>
      </div>
    </WorkspaceShell>
  );
}
