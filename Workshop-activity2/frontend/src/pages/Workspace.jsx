import { Link } from 'react-router-dom';
import WorkspaceShell from '../components/WorkspaceShell';
import { useTeam } from '../context/TeamContext';

function statusFor(count, doneCount) {
  if (count === 0) return { key: 'not_started', label: 'Not Started' };
  if (doneCount >= count) return { key: 'done', label: 'Done' };
  return { key: 'in_progress', label: 'In Progress' };
}

export default function Workspace() {
  const { team, processSteps, evaluateSteps, workflow } = useTeam();

  const mapDone = processSteps.filter((s) => s.step_name.trim()).length;
  const mapStatus = statusFor(processSteps.length, mapDone);

  const identifyDone = processSteps.filter((s) => s.problem.trim() || s.risk.trim()).length;
  const identifyStatus = statusFor(processSteps.length, identifyDone);

  const evalByStep = new Map(evaluateSteps.map((e) => [e.process_step_id, e]));
  const evalDone = processSteps.filter((s) => {
    const e = evalByStep.get(s.id);
    return e && e.ai_agent.trim();
  }).length;

  const designStatus =
    workflow.nodes.length > 0
      ? { key: 'in_progress', label: `${workflow.nodes.length} node(s) placed` }
      : evalDone > 0
        ? { key: 'in_progress', label: 'Evaluated, no diagram yet' }
        : { key: 'not_started', label: 'Not Started' };

  const analysisStatus = team?.submitted_at
    ? { key: 'done', label: 'Submitted' }
    : workflow.nodes.length > 0
      ? { key: 'in_progress', label: 'Ready to review' }
      : { key: 'not_started', label: 'Not Started' };

  const cards = [
    {
      num: 1,
      title: 'Map',
      desc: 'Document the current process — list every step, who owns it, and how long it takes.',
      path: '/workspace/map',
      status: mapStatus,
    },
    {
      num: 2,
      title: 'Identify',
      desc: 'Go back over the process and flag problems and risks per step.',
      path: '/workspace/identify',
      status: identifyStatus,
    },
    {
      num: 3,
      title: 'Design',
      desc: 'Organize your steps, evaluate AI fit, and build the workflow diagram.',
      path: '/workspace/design',
      status: designStatus,
    },
    {
      num: 4,
      title: 'Analysis',
      desc: 'See insights on your workflow and what each AI agent does, then submit.',
      path: '/workspace/analysis',
      status: analysisStatus,
    },
  ];

  return (
    <WorkspaceShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div className="eyebrow">Workshop</div>
          <h1>
            {team ? `${team.name}'s Workspace` : 'Workspace'}
            {team?.department ? ` — ${team.department}` : ''}
          </h1>
          <p className="muted">
            Work through the four steps in order, or jump around — your progress autosaves as
            you type.
          </p>
        </div>
        {team?.submitted_at && <span className="status-badge status-done">Submitted ✓</span>}
      </div>

      <div className="grid grid-cols-2" style={{ marginTop: 24 }}>
        {cards.map((card) => (
          <Link key={card.num} to={card.path} className="card question-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="question-card__top">
              <span className="eyebrow">Step {card.num}</span>
              <span className={`status-badge status-${card.status.key}`}>{card.status.label}</span>
            </div>
            <h2 style={{ margin: '4px 0' }}>{card.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {card.desc}
            </p>
          </Link>
        ))}
      </div>
    </WorkspaceShell>
  );
}
