import { Link } from 'react-router-dom';
import { useTeam } from '../context/TeamContext';

export default function TopBar() {
  const { team, leaveTeam } = useTeam();

  return (
    <header className="top-bar">
      <Link to="/workspace" className="top-bar__brand" style={{ textDecoration: 'none', color: '#fff' }}>
        <span className="top-bar__logo-dot" />
        AI Workflow Designer
      </Link>
      {team && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="top-bar__team">
            {team.name}
            {team.department ? ` · ${team.department}` : ''}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              leaveTeam();
              window.location.href = '/';
            }}
          >
            Switch team
          </button>
        </div>
      )}
    </header>
  );
}
