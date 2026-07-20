import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinTeam } from '../api/client';
import { useTeam } from '../context/TeamContext';

export default function Join() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setTeam } = useTeam();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your team name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await joinTeam(name.trim());
      setTeam(res.team);
      navigate('/workspace');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page--narrow" style={{ paddingTop: '10vh' }}>
      <div className="card">
        <div className="eyebrow">Workshop Activity</div>
        <h1>AI Challenge: Identify, Prompt, Compare</h1>
        <p className="muted">
          Enter your team name to start, or type your team's existing name to
          resume where you left off.
        </p>
        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <label htmlFor="team-name">Team name</label>
          <input
            id="team-name"
            type="text"
            placeholder="e.g. Team Falcon"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {error && (
            <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: 8 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
            disabled={loading}
          >
            {loading ? 'Entering workspace…' : 'Enter Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
