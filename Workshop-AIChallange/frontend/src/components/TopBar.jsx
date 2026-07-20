import { Link } from 'react-router-dom';
import { useTeam } from '../context/TeamContext';

export default function TopBar() {
  const { team, leaveTeam } = useTeam();

  return (
    <header className="top-bar">
      <Link to="/" style={{ textDecoration: 'none' }}>
        <div className="top-bar__brand">
          <span className="top-bar__logo-dot" />
          Bossard AI Challenge
        </div>
      </Link>
      {team && (
        <div className="top-bar__team">
          Team: <strong>{team.name}</strong>{' '}
          <button
            className="btn btn-secondary"
            style={{ marginLeft: 12, padding: '4px 12px', fontSize: '0.78rem' }}
            onClick={leaveTeam}
          >
            Switch team
          </button>
        </div>
      )}
    </header>
  );
}
