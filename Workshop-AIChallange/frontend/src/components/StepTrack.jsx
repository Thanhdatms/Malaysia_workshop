import { Fragment } from 'react';

const DEFAULT_STEPS = ['Task', 'Can AI Solve?', 'Write Prompt', 'Compare Results'];

export default function StepTrack({ activeIndex, steps = DEFAULT_STEPS }) {
  return (
    <div className="step-track">
      {steps.map((label, i) => (
        <Fragment key={label}>
          <div className={`step-track__item${i === activeIndex ? '' : ' is-inactive'}`}>
            <div className="step-track__num">{i + 1}</div>
            <div className="step-track__label">{label}</div>
          </div>
          {i < steps.length - 1 && <span className="step-track__arrow">&#9654;</span>}
        </Fragment>
      ))}
    </div>
  );
}
