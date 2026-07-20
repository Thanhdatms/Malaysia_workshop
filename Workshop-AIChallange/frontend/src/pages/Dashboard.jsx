import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, getSubmissions } from '../api/client';
import { useTeam } from '../context/TeamContext';
import { StatusBadge } from '../components/Badges';

export default function Dashboard() {
  const { team } = useTeam();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team) {
      navigate('/');
      return;
    }
    Promise.all([getQuestions(), getSubmissions(team.id)])
      .then(([qs, subs]) => {
        setQuestions(qs);
        const map = {};
        subs.forEach((s) => {
          map[s.question_id] = s;
        });
        setSubmissions(map);
      })
      .finally(() => setLoading(false));
  }, [team, navigate]);

  if (!team) return null;

  const doneCount = Object.values(submissions).filter((s) => s.status === 'submitted').length;

  return (
    <div className="page">
      <div className="eyebrow">Activity 1 · 6 Tasks · Group Work</div>
      <h1>AI Challenge: Identify, Prompt, Compare</h1>
      <p className="muted">
        Work through each task below: read it, decide if AI can help, try a normal
        prompt, then try the prompt template, and compare the two results.
      </p>

      {loading ? (
        <p className="muted">Loading tasks…</p>
      ) : (
        <>
          <p style={{ fontWeight: 600, color: 'var(--navy)' }}>
            Progress: {doneCount} / {questions.length} submitted
          </p>
          <div className="grid grid-cols-3" style={{ marginTop: 12 }}>
            {questions.map((q) => {
              const sub = submissions[q.id];
              return (
                <div
                  key={q.id}
                  className="card question-card"
                  onClick={() => navigate(`/workspace/question/${q.id}`)}
                >
                  <div className="question-card__top">
                    <span className="dept-tag">{q.department}</span>
                    <StatusBadge status={sub?.status} />
                  </div>
                  <h3 style={{ margin: 0 }}>
                    {q.order_index}. {q.title}
                  </h3>
                  <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                    {q.files.length > 0
                      ? `Includes ${q.files.length} file${q.files.length > 1 ? 's' : ''} to download`
                      : 'No files needed'}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
