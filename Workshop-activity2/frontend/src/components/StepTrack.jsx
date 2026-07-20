import { Fragment } from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  { num: 1, label: 'Map', path: '/workspace/map' },
  { num: 2, label: 'Identify', path: '/workspace/identify' },
  { num: 3, label: 'Design', path: '/workspace/design' },
  { num: 4, label: 'Analysis', path: '/workspace/analysis' },
];

export default function StepTrack({ current }) {
  return (
    <div className="step-track">
      {STEPS.map((step, idx) => (
        <Fragment key={step.num}>
          <Link
            to={step.path}
            className={`step-track__item ${step.num === current ? 'is-active' : 'is-inactive'}`}
          >
            <span className="step-track__num">{step.num}</span>
            <div className="step-track__label">{step.label}</div>
          </Link>
          {idx < STEPS.length - 1 && <span className="step-track__arrow">▶</span>}
        </Fragment>
      ))}
    </div>
  );
}
