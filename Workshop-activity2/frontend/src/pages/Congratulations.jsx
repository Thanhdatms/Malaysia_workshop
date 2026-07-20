import { useNavigate } from 'react-router-dom';
import WorkspaceShell from '../components/WorkspaceShell';
import { useTeam } from '../context/TeamContext';

export default function Congratulations() {
  const { team } = useTeam();
  const navigate = useNavigate();

  return (
    <WorkspaceShell>
      <div style={{ maxWidth: 480, margin: '8vh auto 0' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
          <div className="eyebrow">Submitted</div>
          <h1 style={{ margin: '4px 0 8px' }}>Congratulations!</h1>
          <p className="muted">
            {team ? `${team.name}'s` : "Your team's"} AI workflow has been submitted. Great work
            mapping, identifying, evaluating, and designing your AI-enhanced process.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/workspace')}
          >
            Back to Workspace
          </button>
        </div>
      </div>
    </WorkspaceShell>
  );
}
