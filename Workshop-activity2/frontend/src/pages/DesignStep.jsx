import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import StepPageShell from '../components/StepPageShell';
import SaveIndicator from '../components/SaveIndicator';
import EvaluateTable, { buildEvaluateRows } from '../components/EvaluateTable';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import { useTeam } from '../context/TeamContext';
import { useAutosave } from '../hooks/useAutosave';
import {
  saveProcessSteps,
  organizeProcessSteps,
  saveEvaluateSteps,
  getEvaluateAiProposal,
  saveWorkflow,
  generateWorkflowProposal,
  editWorkflowWithAi,
} from '../api/client';

function mergeEvaluateProposal(rows, proposals) {
  const byStep = new Map(proposals.map((p) => [p.process_step_id, p]));
  return rows.map((row) => {
    const p = byStep.get(row.process_step_id);
    return p
      ? {
          ...row,
          data_needed: p.data_needed,
          ai_agent: p.ai_agent,
          human_in_the_loop: p.human_in_the_loop,
          notes_for_design: p.notes_for_design,
        }
      : row;
  });
}

function combineStatus(a, b) {
  if (a === 'saving' || b === 'saving') return 'saving';
  if (a === 'error' || b === 'error') return 'error';
  if (a === 'saved' || b === 'saved') return 'saved';
  return 'idle';
}

export default function DesignStep() {
  const {
    team,
    processSteps,
    setProcessSteps,
    evaluateSteps,
    setEvaluateSteps,
    workflow,
    setWorkflow,
  } = useTeam();
  const navigate = useNavigate();

  // ---------- Evaluate table ----------
  const [rows, setRows] = useState(() => buildEvaluateRows(processSteps, evaluateSteps));
  const [evalAiPending, setEvalAiPending] = useState(false);
  const [evalAiLoading, setEvalAiLoading] = useState(false);
  const [evalConfirmSaving, setEvalConfirmSaving] = useState(false);
  const [evalAiError, setEvalAiError] = useState('');
  const preEvalAiSnapshotRef = useRef(null);

  // ---------- Background auto-setup: organize steps + evaluate proposal ----------
  const [autoSetupRunning, setAutoSetupRunning] = useState(false);
  const [autoSetupDone, setAutoSetupDone] = useState(false);
  const [autoSetupError, setAutoSetupError] = useState('');
  const autoSetupTriedRef = useRef(false);

  const { status: evalStatus, markSaved: markEvalSaved } = useAutosave(
    rows,
    (data) =>
      saveEvaluateSteps(
        team.id,
        data.map(({ step_name, ...rest }) => rest)
      ),
    {
      enabled: !evalAiPending && !autoSetupRunning,
      onSaved: (result) => {
        setEvaluateSteps(result);
        setRows((prev) =>
          prev.map((row) => {
            const match = result.find((r) => r.process_step_id === row.process_step_id);
            return match
              ? {
                  ...row,
                  data_needed: match.data_needed,
                  ai_agent: match.ai_agent,
                  human_in_the_loop: match.human_in_the_loop,
                  notes_for_design: match.notes_for_design,
                }
              : row;
          })
        );
      },
    }
  );

  async function runAutoSetup() {
    setAutoSetupRunning(true);
    setAutoSetupError('');
    try {
      const orgRes = await organizeProcessSteps(team.id);
      const orgPayload = orgRes.steps.map((s) => ({ ...s, id: null }));
      const savedSteps = await saveProcessSteps(team.id, orgPayload);
      setProcessSteps(savedSteps);

      const freshRows = buildEvaluateRows(savedSteps, []);
      const evalRes = await getEvaluateAiProposal(team.id);
      const proposedRows = mergeEvaluateProposal(freshRows, evalRes.proposals);
      const savedEval = await saveEvaluateSteps(
        team.id,
        proposedRows.map(({ step_name, ...rest }) => rest)
      );
      setEvaluateSteps(savedEval);
      const merged = proposedRows.map((row) => {
        const match = savedEval.find((r) => r.process_step_id === row.process_step_id);
        return match
          ? {
              ...row,
              data_needed: match.data_needed,
              ai_agent: match.ai_agent,
              human_in_the_loop: match.human_in_the_loop,
              notes_for_design: match.notes_for_design,
            }
          : row;
      });
      setRows(merged);
      markEvalSaved(merged);
    } catch (err) {
      setAutoSetupError(
        err.message || 'Could not auto-organize your steps. You can still fill things in manually below.'
      );
    } finally {
      setAutoSetupRunning(false);
    }
  }

  useEffect(() => {
    if (autoSetupTriedRef.current) return;
    autoSetupTriedRef.current = true;
    if (processSteps.length === 0 || evaluateSteps.length > 0) {
      setAutoSetupDone(true);
      return;
    }
    runAutoSetup().finally(() => setAutoSetupDone(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEvalAiProposal() {
    setEvalAiLoading(true);
    setEvalAiError('');
    try {
      const res = await getEvaluateAiProposal(team.id);
      preEvalAiSnapshotRef.current = rows;
      setRows((prev) => mergeEvaluateProposal(prev, res.proposals));
      setEvalAiPending(true);
    } catch (err) {
      setEvalAiError(err.message || 'Could not get an AI proposal. Please try again.');
    } finally {
      setEvalAiLoading(false);
    }
  }

  async function handleEvalConfirmProposal() {
    setEvalConfirmSaving(true);
    setEvalAiError('');
    try {
      const result = await saveEvaluateSteps(
        team.id,
        rows.map(({ step_name, ...rest }) => rest)
      );
      setEvaluateSteps(result);
      const merged = rows.map((row) => {
        const match = result.find((r) => r.process_step_id === row.process_step_id);
        return match
          ? {
              ...row,
              data_needed: match.data_needed,
              ai_agent: match.ai_agent,
              human_in_the_loop: match.human_in_the_loop,
              notes_for_design: match.notes_for_design,
            }
          : row;
      });
      setRows(merged);
      markEvalSaved(merged);
      setEvalAiPending(false);
      preEvalAiSnapshotRef.current = null;
    } catch (err) {
      setEvalAiError(err.message || 'Could not save. Please try again.');
    } finally {
      setEvalConfirmSaving(false);
    }
  }

  function handleEvalDiscardProposal() {
    if (preEvalAiSnapshotRef.current) setRows(preEvalAiSnapshotRef.current);
    preEvalAiSnapshotRef.current = null;
    setEvalAiPending(false);
    setEvalAiError('');
  }

  // ---------- Workflow canvas ----------
  const [graph, setGraph] = useState(workflow);
  const [graphVersion, setGraphVersion] = useState(0);
  const [wfGenerating, setWfGenerating] = useState(false);
  const [wfError, setWfError] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const autoTriedRef = useRef(false);
  const wfBusy = wfGenerating || editLoading;

  const { status: wfStatus } = useAutosave(graph, (data) => saveWorkflow(team.id, data), {
    delay: 1000,
    enabled: !wfBusy,
    onSaved: (result) => setWorkflow(result),
  });

  async function handleWfGenerate({ confirmOverwrite = false } = {}) {
    if (confirmOverwrite && graph.nodes.length > 0) {
      const ok = window.confirm(
        "This replaces your current workflow diagram with a new AI-generated one — your existing boxes and arrows will be lost. Continue?"
      );
      if (!ok) return;
    }
    setWfGenerating(true);
    setWfError('');
    try {
      const res = await generateWorkflowProposal(team.id);
      setGraph({ nodes: res.nodes, edges: res.edges });
      setGraphVersion((v) => v + 1);
    } catch (err) {
      setWfError(err.message || 'Could not generate a workflow. Please try again.');
    } finally {
      setWfGenerating(false);
    }
  }

  useEffect(() => {
    if (!autoSetupDone) return;
    if (autoTriedRef.current) return;
    if (graph.nodes.length > 0) return;
    if (processSteps.length === 0) return;
    autoTriedRef.current = true;
    handleWfGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSetupDone]);

  async function handleEditSubmit(e) {
    e.preventDefault();
    const instruction = editPrompt.trim();
    if (!instruction || editLoading) return;
    setEditLoading(true);
    setWfError('');
    try {
      const res = await editWorkflowWithAi(team.id, instruction, graph);
      setGraph({ nodes: res.nodes, edges: res.edges });
      setGraphVersion((v) => v + 1);
      setEditPrompt('');
    } catch (err) {
      setWfError(err.message || 'Could not apply that change. Please try again.');
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <StepPageShell
      step={3}
      eyebrow="Step 3 of 4 · Design"
      title="Design the AI Workflow"
      subtitle="AI organizes your steps and proposes an AI-fit evaluation automatically — edit anything below, then build the workflow diagram."
      topRight={<SaveIndicator status={combineStatus(evalStatus, wfStatus)} />}
      wide
      onBack={() => navigate('/workspace/identify')}
      onNext={() => navigate('/workspace/analysis')}
      nextLabel="Next: Analysis"
    >
      {/* 1. Evaluate AI applicability */}
      <div className="design-section">
        <div className="design-section__header">
          <h2>Evaluate AI Applicability</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleEvalAiProposal}
            disabled={evalAiLoading || evalAiPending || autoSetupRunning || rows.length === 0}
          >
            {evalAiLoading ? 'Thinking…' : '✨ AI Proposal'}
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No steps yet. Go to <strong>Step 1 · Map</strong> first to list your process steps.
          </p>
        ) : autoSetupRunning ? (
          <p className="muted" style={{ margin: 0 }}>
            ✨ Organizing your steps and evaluating AI fit for each one…
          </p>
        ) : (
          <>
            {autoSetupError && (
              <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 12 }}>
                {autoSetupError}
              </p>
            )}
            {evalAiPending && (
              <div
                className="card"
                style={{
                  background: 'var(--bossard-blue-light)',
                  border: '1px solid var(--bossard-blue)',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: 14,
                }}
              >
                <span style={{ fontSize: '0.88rem', color: 'var(--navy)' }}>
                  ✨ AI has proposed values below. Edit anything that isn't quite right, then
                  confirm to save.
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleEvalDiscardProposal}
                    disabled={evalConfirmSaving}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleEvalConfirmProposal}
                    disabled={evalConfirmSaving}
                  >
                    {evalConfirmSaving ? 'Saving…' : 'Confirm & Save'}
                  </button>
                </div>
              </div>
            )}
            {evalAiError && (
              <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 12 }}>
                {evalAiError}
              </p>
            )}
            <EvaluateTable rows={rows} onChange={setRows} />
          </>
        )}
      </div>

      {/* 2. Workflow diagram */}
      <div className="design-section">
        <div className="design-section__header">
          <h2>Build the Workflow Diagram</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleWfGenerate({ confirmOverwrite: true })}
            disabled={wfBusy || processSteps.length === 0}
          >
            {wfGenerating
              ? 'Generating…'
              : graph.nodes.length > 0
                ? '✨ Regenerate with AI'
                : '✨ Generate with AI'}
          </button>
        </div>
        {wfGenerating && graph.nodes.length === 0 && (
          <p className="muted" style={{ marginTop: 0 }}>
            ✨ Generating your initial workflow from Steps 1-3…
          </p>
        )}
        {wfError && (
          <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: 0 }}>{wfError}</p>
        )}

        <form className="ai-edit-bar" onSubmit={handleEditSubmit}>
          <span className="ai-edit-bar__icon">✨</span>
          <input
            type="text"
            className="ai-edit-bar__input"
            placeholder={
              graph.nodes.length === 0
                ? 'Generate a workflow first, then ask AI to change it here…'
                : "Ask AI to change the workflow… e.g. \"Add a fraud check before sending replies\""
            }
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            disabled={wfBusy || graph.nodes.length === 0}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={wfBusy || !editPrompt.trim() || graph.nodes.length === 0}
          >
            {editLoading ? 'Updating…' : 'Apply'}
          </button>
        </form>

        <ReactFlowProvider>
          <WorkflowCanvas
            key={graphVersion}
            initialNodes={graph.nodes}
            initialEdges={graph.edges}
            onGraphChange={(nodes, edges) => setGraph({ nodes, edges })}
          />
        </ReactFlowProvider>
      </div>
    </StepPageShell>
  );
}
