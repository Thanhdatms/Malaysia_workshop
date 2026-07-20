import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepPageShell from '../components/StepPageShell';
import ProcessStepTable from '../components/ProcessStepTable';
import SaveIndicator from '../components/SaveIndicator';
import { useTeam } from '../context/TeamContext';
import { useAutosave } from '../hooks/useAutosave';
import { saveProcessSteps } from '../api/client';

export default function MapStep() {
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
      step={1}
      eyebrow="Step 1 of 4 · Map"
      title="Map the Process"
      subtitle="List every step in the current process, who owns it, and how long it takes."
      topRight={<SaveIndicator status={status} />}
      wide
      onBack={() => navigate('/workspace')}
      backLabel="Back to Workspace"
      onNext={() => navigate('/workspace/identify')}
      nextLabel="Next: Identify"
    >
      <ProcessStepTable steps={steps} onChange={setSteps} mode="map" />
    </StepPageShell>
  );
}
