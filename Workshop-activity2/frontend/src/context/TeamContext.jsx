import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { joinTeam as apiJoinTeam, submitTeam as apiSubmitTeam } from '../api/client';

const STORAGE_KEY = 'workshop2_team_name';

const EMPTY_BENEFIT_ANALYSIS = {
  before_manual_steps: 0,
  after_manual_steps: 0,
  after_automated_steps: 0,
  time_saved_estimate: '',
  time_saved_explanation: '',
  risks_addressed: [],
  benefits_short_term: [],
  benefits_long_term: [],
};

const TeamContext = createContext(null);

export function TeamProvider({ children }) {
  const [team, setTeam] = useState(null);
  const [processSteps, setProcessSteps] = useState([]);
  const [evaluateSteps, setEvaluateSteps] = useState([]);
  const [workflow, setWorkflow] = useState({ nodes: [], edges: [] });
  const [benefitAnalysis, setBenefitAnalysis] = useState(EMPTY_BENEFIT_ANALYSIS);
  const [restoring, setRestoring] = useState(true);

  const applyJoinResponse = useCallback((res) => {
    setTeam(res.team);
    setProcessSteps(res.process_steps);
    setEvaluateSteps(res.evaluate_steps);
    setWorkflow(res.workflow);
    setBenefitAnalysis(res.benefit_analysis || EMPTY_BENEFIT_ANALYSIS);
    localStorage.setItem(STORAGE_KEY, res.team.name);
  }, []);

  const join = useCallback(
    async (name, department) => {
      const res = await apiJoinTeam(name, department);
      applyJoinResponse(res);
      return res;
    },
    [applyJoinResponse]
  );

  const submitTeam = useCallback(async () => {
    const updated = await apiSubmitTeam(team.id);
    setTeam(updated);
    return updated;
  }, [team]);

  const leaveTeam = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTeam(null);
    setProcessSteps([]);
    setEvaluateSteps([]);
    setWorkflow({ nodes: [], edges: [] });
    setBenefitAnalysis(EMPTY_BENEFIT_ANALYSIS);
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem(STORAGE_KEY);
    if (!savedName) {
      setRestoring(false);
      return;
    }
    apiJoinTeam(savedName, '')
      .then(applyJoinResponse)
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setRestoring(false));
  }, [applyJoinResponse]);

  return (
    <TeamContext.Provider
      value={{
        team,
        processSteps,
        setProcessSteps,
        evaluateSteps,
        setEvaluateSteps,
        workflow,
        setWorkflow,
        benefitAnalysis,
        setBenefitAnalysis,
        join,
        submitTeam,
        leaveTeam,
        restoring,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used within TeamProvider');
  return ctx;
}
