import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepPageShell from '../components/StepPageShell';
import { useTeam } from '../context/TeamContext';
import { generateBenefitAnalysis, saveBenefitAnalysis } from '../api/client';
import { NODE_TYPES } from '../components/workflow/nodeConfig';

function StatTile({ label, value }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__value">{value}</div>
      <div className="stat-tile__label">{label}</div>
    </div>
  );
}

export default function Analysis() {
  const {
    team,
    processSteps,
    evaluateSteps,
    workflow,
    benefitAnalysis,
    setBenefitAnalysis,
  } = useTeam();
  const navigate = useNavigate();
  const hasContent = processSteps.length > 0 || workflow.nodes.length > 0;

  const stats = useMemo(() => {
    const totalSteps = processSteps.length;
    const stepsWithAI = evaluateSteps.filter((e) => e.ai_agent.trim()).length;
    const humanInLoop = evaluateSteps.filter((e) => e.human_in_the_loop).length;
    const outgoingCount = {};
    const incomingCount = {};
    workflow.edges.forEach((e) => {
      outgoingCount[e.source] = (outgoingCount[e.source] || 0) + 1;
      incomingCount[e.target] = (incomingCount[e.target] || 0) + 1;
    });
    return {
      totalSteps,
      stepsWithAI,
      aiCoveragePercent: totalSteps > 0 ? Math.round((stepsWithAI / totalSteps) * 100) : 0,
      humanInLoop,
      totalNodes: workflow.nodes.length,
      branchPoints: Object.values(outgoingCount).filter((c) => c > 1).length,
      mergePoints: Object.values(incomingCount).filter((c) => c > 1).length,
    };
  }, [processSteps, evaluateSteps, workflow]);

  // ---------- AI Agents Summary ----------
  const agentNodes = useMemo(
    () => workflow.nodes.filter((n) => n.data?.nodeType === 'ai_agent'),
    [workflow.nodes]
  );

  const agentsFromEvaluate = useMemo(() => {
    if (agentNodes.length > 0) return [];
    const map = new Map();
    evaluateSteps.forEach((e) => {
      const name = e.ai_agent.trim();
      if (!name) return;
      const step = processSteps.find((s) => s.id === e.process_step_id);
      const stepName = step ? step.step_name : 'a step';
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(stepName);
    });
    return Array.from(map.entries()).map(([name, steps]) => ({ name, steps }));
  }, [agentNodes, evaluateSteps, processSteps]);

  // ---------- Benefit Analysis (generated once, saved, read-only) ----------
  const hasBenefitData =
    benefitAnalysis.benefits_short_term.length > 0 || benefitAnalysis.benefits_long_term.length > 0;
  const [benefitLoading, setBenefitLoading] = useState(false);
  const [benefitError, setBenefitError] = useState('');
  const autoBenefitTriedRef = useRef(false);

  async function handleGenerateBenefit(confirmOverwrite = false) {
    if (confirmOverwrite && hasBenefitData) {
      const ok = window.confirm(
        'This replaces your current Benefit Analysis with a new AI-generated version. Continue?'
      );
      if (!ok) return;
    }
    setBenefitLoading(true);
    setBenefitError('');
    try {
      const generated = await generateBenefitAnalysis(team.id);
      const saved = await saveBenefitAnalysis(team.id, generated);
      setBenefitAnalysis(saved);
    } catch (err) {
      setBenefitError(err.message || 'Could not generate insights. Please try again.');
    } finally {
      setBenefitLoading(false);
    }
  }

  useEffect(() => {
    if (autoBenefitTriedRef.current) return;
    autoBenefitTriedRef.current = true;
    if (hasBenefitData || !hasContent) return;
    handleGenerateBenefit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepPageShell
      step={4}
      eyebrow="Step 4 of 4 · Analysis"
      title="Understand Your AI Workflow"
      subtitle="A quick look at what you built, before you submit."
      wide
      onBack={() => navigate('/workspace/design')}
      onNext={() => navigate('/workspace/review')}
      nextLabel="Mark as Submitted"
    >
      {!hasContent ? (
        <p className="muted" style={{ margin: 0 }}>
          Complete Steps 1-3 first — there's nothing to analyze yet.
        </p>
      ) : (
        <>
          <div className="design-section">
            <h2 style={{ marginTop: 0 }}>At a Glance</h2>
            <div className="stat-grid">
              <StatTile label="Process steps" value={stats.totalSteps} />
              <StatTile label="AI-assisted steps" value={`${stats.aiCoveragePercent}%`} />
              <StatTile label="Human checkpoints" value={stats.humanInLoop} />
              <StatTile label="Workflow boxes" value={stats.totalNodes} />
              <StatTile label="Branch points" value={stats.branchPoints} />
              <StatTile label="Merge points" value={stats.mergePoints} />
            </div>
          </div>

          <div className="design-section">
            <h2 style={{ marginTop: 0 }}>AI Agents Summary</h2>
            {agentNodes.length > 0 ? (
              <div className="node-walk">
                {agentNodes.map((n) => (
                  <div
                    key={n.id}
                    className="node-walk-item"
                    style={{ borderLeftColor: NODE_TYPES.ai_agent.color }}
                  >
                    <div className="node-walk-item__top">
                      <span
                        className="pill"
                        style={{
                          background: `${NODE_TYPES.ai_agent.color}1a`,
                          color: NODE_TYPES.ai_agent.color,
                        }}
                      >
                        AI Agent
                      </span>
                      <strong>{n.data?.label}</strong>
                    </div>
                    {n.data?.description && (
                      <p className="muted" style={{ margin: '4px 0 0' }}>
                        {n.data.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : agentsFromEvaluate.length > 0 ? (
              <div className="node-walk">
                {agentsFromEvaluate.map((a) => (
                  <div
                    key={a.name}
                    className="node-walk-item"
                    style={{ borderLeftColor: NODE_TYPES.ai_agent.color }}
                  >
                    <div className="node-walk-item__top">
                      <span
                        className="pill"
                        style={{
                          background: `${NODE_TYPES.ai_agent.color}1a`,
                          color: NODE_TYPES.ai_agent.color,
                        }}
                      >
                        AI Agent
                      </span>
                      <strong>{a.name}</strong>
                    </div>
                    <p className="muted" style={{ margin: '4px 0 0' }}>
                      Used in: {a.steps.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                No AI agents yet — build your workflow diagram in Step 3 to see them summarized
                here.
              </p>
            )}
          </div>

          <div className="design-section">
            <div className="design-section__header">
              <h2>Benefit Analysis</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleGenerateBenefit(true)}
                disabled={benefitLoading}
              >
                {benefitLoading ? 'Thinking…' : '✨ Regenerate'}
              </button>
            </div>
            {benefitError && (
              <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{benefitError}</p>
            )}
            {benefitLoading && !hasBenefitData ? (
              <p className="muted">
                ✨ Working out manual vs. automated steps, time saved, and key benefits…
              </p>
            ) : !hasBenefitData ? (
              <p className="muted">No benefit analysis yet.</p>
            ) : (
              <div className="benefit-analysis">
                <div className="benefit-compare">
                  <div className="benefit-compare__box">
                    <div className="benefit-compare__value">
                      {benefitAnalysis.before_manual_steps}
                    </div>
                    <div className="benefit-compare__label">Manual steps (before)</div>
                  </div>
                  <span className="benefit-compare__arrow">→</span>
                  <div className="benefit-compare__box benefit-compare__box--automated">
                    <div className="benefit-compare__value">
                      {benefitAnalysis.after_automated_steps}
                    </div>
                    <div className="benefit-compare__label">AI-assisted (after)</div>
                  </div>
                  <div className="benefit-compare__box">
                    <div className="benefit-compare__value">
                      {benefitAnalysis.after_manual_steps}
                    </div>
                    <div className="benefit-compare__label">Still manual (after)</div>
                  </div>
                </div>

                {benefitAnalysis.time_saved_estimate && (
                  <div className="benefit-callout">
                    <strong>⏱ Time saved: {benefitAnalysis.time_saved_estimate}</strong>
                    {benefitAnalysis.time_saved_explanation && (
                      <p className="muted" style={{ margin: '4px 0 0' }}>
                        {benefitAnalysis.time_saved_explanation}
                      </p>
                    )}
                  </div>
                )}

                {benefitAnalysis.risks_addressed.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3>Risks &amp; Problems Addressed</h3>
                    <ul className="benefit-list">
                      {benefitAnalysis.risks_addressed.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="benefit-columns">
                  <div>
                    <h3>Short-Term Benefits</h3>
                    <ul className="benefit-list">
                      {benefitAnalysis.benefits_short_term.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>Long-Term Benefits</h3>
                    <ul className="benefit-list">
                      {benefitAnalysis.benefits_long_term.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </StepPageShell>
  );
}
