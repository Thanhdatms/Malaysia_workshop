import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepPageShell from '../components/StepPageShell';
import ProcessStepTable from '../components/ProcessStepTable';
import SaveIndicator from '../components/SaveIndicator';
import { useTeam } from '../context/TeamContext';
import { useAutosave } from '../hooks/useAutosave';
import { saveProcessSteps } from '../api/client';

export default function IdentifyStep() {
  const { team, processSteps, setProcessSteps } = useTeam();
  const [steps, setSteps] = useState(processSteps);
  const navigate = useNavigate();

  const { status } = useAutosave(steps, (data) => saveProcessSteps(team.id, data), {
    onSaved: (result) => {
      setSteps(result);
      setProcessSteps(result);
    },
  });

  return (
    <StepPageShell
      step={2}
      eyebrow="Step 2 of 4 · Identify"
      title="Identify Pain Points"
      subtitle={
        'Same steps as Map — flag the problem and risk in each one, or tick "No problem" / "No risk" if it\'s fine.'
      }
      topRight={<SaveIndicator status={status} />}
      wide
      onBack={() => navigate('/workspace/map')}
      onNext={() => navigate('/workspace/design')}
      nextLabel="Next: Design"
    >
      {steps.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No steps yet. Go to <strong>Step 1 · Map</strong> first to list your process steps.
        </p>
      ) : (
        <ProcessStepTable steps={steps} onChange={setSteps} mode="identify" />
      )}
    </StepPageShell>
  );
}
