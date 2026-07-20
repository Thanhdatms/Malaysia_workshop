import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getQuestion,
  getTemplates,
  getSubmissions,
  updateSubmission,
  fileDownloadUrl,
} from '../api/client';
import { useTeam } from '../context/TeamContext';
import StepTrack from '../components/StepTrack';
import ChatWidget from '../components/ChatWidget';

const FULL_STEPS = ['Task', 'Can AI Solve?', 'Write Prompt', 'Compare Results'];
const NO_AI_STEPS = ['Task', 'Can AI Solve?', 'Your Justification'];

const EMPTY_SUB = {
  ai_applicable_answer: null,
  ai_applicable_reasoning: '',
  normal_prompt_text: '',
  normal_prompt_result: '',
  template_prompt_text: '',
  template_prompt_result: '',
  status: 'not_started',
};

export default function QuestionWizard() {
  const { id } = useParams();
  const { team } = useTeam();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [sub, setSub] = useState(EMPTY_SUB);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const saveTimer = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!team) {
      navigate('/');
      return;
    }
    setLoading(true);
    setStep(0);
    setConfirmOpen(false);
    setJustSubmitted(false);
    isFirstLoad.current = true;
    Promise.all([getQuestion(id), getTemplates(id), getSubmissions(team.id)])
      .then(([q, tmpls, subs]) => {
        setQuestion(q);
        setTemplates(tmpls);
        const existing = subs.find((s) => s.question_id === id);
        setSub(existing ? { ...EMPTY_SUB, ...existing } : { ...EMPTY_SUB });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, team]);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!team) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateSubmission(team.id, id, sub).then(() => {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
      });
    }, 700);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub]);

  function patch(fields) {
    setSub((prev) => ({
      ...prev,
      ...fields,
      status: prev.status === 'not_started' ? 'in_progress' : prev.status,
    }));
  }

  async function confirmSubmit() {
    setSubmitting(true);
    const updated = { ...sub, status: 'submitted' };
    try {
      await updateSubmission(team.id, id, updated);
      setSub(updated);
      setConfirmOpen(false);
      setJustSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!team) return null;
  if (loading || !question) {
    return (
      <div className="page">
        <p className="muted">Loading task…</p>
      </div>
    );
  }

  if (justSubmitted) {
    return (
      <div className="page">
        <CongratsScreen
          teamName={team.name}
          questionTitle={question.title}
          onBack={() => navigate('/workspace')}
        />
      </div>
    );
  }

  const steps = question.hide_prompt_steps ? NO_AI_STEPS : FULL_STEPS;
  const maxStep = steps.length - 1;

  return (
    <div className="page">
      <div className="eyebrow">
        {question.department} · Task {question.order_index} of 6
        {question.time_limit_minutes ? ` · ~${question.time_limit_minutes} min` : ''}
      </div>
      <h1>{question.title}</h1>
      <StepTrack activeIndex={step} steps={steps} />

      <div className="card">
        {step === 0 && <TaskStep question={question} />}
        {step === 1 && (
          <AiStep
            value={sub.ai_applicable_answer}
            reasoning={sub.ai_applicable_reasoning}
            onChange={patch}
          />
        )}
        {step === 2 && !question.hide_prompt_steps && (
          <WritePromptStep sub={sub} templates={templates} onChange={patch} />
        )}
        {step === 2 && question.hide_prompt_steps && (
          <JustificationStep reasoning={sub.ai_applicable_reasoning} onChange={patch} />
        )}
        {step === 3 && !question.hide_prompt_steps && <CompareStep sub={sub} />}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button
            className="btn btn-secondary"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </button>
          {step < maxStep ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
            >
              Next
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setConfirmOpen(true)}>
              Mark as Submitted
            </button>
          )}
        </div>
      </div>

      {confirmOpen && (
        <ConfirmModal
          sub={sub}
          hidePromptSteps={question.hide_prompt_steps}
          submitting={submitting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmSubmit}
        />
      )}

      {savedFlash && <div className="toast">Saved</div>}
      <ChatWidget key={id} />
    </div>
  );
}

function TaskStep({ question }) {
  return (
    <div>
      <h3>Read the task</h3>
      <p className="scenario-text">{question.scenario_text}</p>
      {question.files.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <label>Attached files</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {question.files.map((f) => (
              <a
                key={f.id}
                className="file-chip"
                href={fileDownloadUrl(question.id, f.id)}
                download
              >
                📎 {f.filename}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AiStep({ value, reasoning, onChange }) {
  const options = [
    { key: 'yes', label: 'Yes' },
    { key: 'partial', label: 'Partial' },
    { key: 'no', label: 'No' },
  ];
  return (
    <div>
      <h3>Can AI solve this task?</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className={o.key === value ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => onChange({ ai_applicable_answer: o.key })}
          >
            {o.label}
          </button>
        ))}
      </div>
      <label htmlFor="reasoning">Why?</label>
      <textarea
        id="reasoning"
        rows={4}
        placeholder="Explain your reasoning…"
        value={reasoning || ''}
        onChange={(e) => onChange({ ai_applicable_reasoning: e.target.value })}
      />
    </div>
  );
}

function JustificationStep({ reasoning, onChange }) {
  return (
    <div>
      <h3>Your justification</h3>
      <p className="muted">
        This task should not be delegated to AI. Explain your reasoning in
        detail — this is the main deliverable for this question.
      </p>
      <textarea
        rows={8}
        placeholder="Write your justification here…"
        value={reasoning || ''}
        onChange={(e) => onChange({ ai_applicable_reasoning: e.target.value })}
      />
    </div>
  );
}

function WritePromptStep({ sub, templates, onChange }) {
  return (
    <div>
      <h3>Write your prompts</h3>
      <div className="grid grid-cols-2">
        <div>
          <h4 style={{ marginTop: 0 }}>1. Prompt like normal</h4>
          <label>Your prompt</label>
          <textarea
            rows={4}
            value={sub.normal_prompt_text || ''}
            onChange={(e) => onChange({ normal_prompt_text: e.target.value })}
            placeholder="What you typed into the AI chat…"
          />
          <label style={{ marginTop: 12 }}>AI's result</label>
          <textarea
            rows={6}
            value={sub.normal_prompt_result || ''}
            onChange={(e) => onChange({ normal_prompt_result: e.target.value })}
            placeholder="Paste the AI's output here…"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0 }}>2. Prompt with the template</h4>
          {templates.map((t) => (
            <div key={t.id} style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label style={{ marginBottom: 4 }}>{t.title}</label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => navigator.clipboard.writeText(t.template_text)}
                >
                  Copy
                </button>
              </div>
              <div className="template-box">{t.template_text}</div>
            </div>
          ))}
          <label style={{ marginTop: 12 }}>Your filled-in prompt</label>
          <textarea
            rows={4}
            value={sub.template_prompt_text || ''}
            onChange={(e) => onChange({ template_prompt_text: e.target.value })}
            placeholder="Paste the template with your data filled in…"
          />
          <label style={{ marginTop: 12 }}>AI's result</label>
          <textarea
            rows={6}
            value={sub.template_prompt_result || ''}
            onChange={(e) => onChange({ template_prompt_result: e.target.value })}
            placeholder="Paste the AI's output here…"
          />
        </div>
      </div>
    </div>
  );
}

function truncate(text, max) {
  if (!text) return text;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function SummaryField({ label, value }) {
  return (
    <div>
      <label>{label}</label>
      <div className="template-box" style={{ minHeight: 0, borderStyle: 'solid' }}>
        {value ? truncate(value, 400) : <span className="muted">(empty)</span>}
      </div>
    </div>
  );
}

function ConfirmModal({ sub, hidePromptSteps, submitting, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="card modal-card">
        <h3 style={{ marginTop: 0 }}>Review before submitting</h3>
        <p className="muted">
          Double-check what your team has entered for this task. You can still
          come back and edit after submitting.
        </p>
        <div style={{ display: 'grid', gap: 12, margin: '16px 0' }}>
          <SummaryField
            label="Can AI solve it?"
            value={sub.ai_applicable_answer ? sub.ai_applicable_answer.toUpperCase() : ''}
          />
          {hidePromptSteps ? (
            <SummaryField label="Your justification" value={sub.ai_applicable_reasoning} />
          ) : (
            <>
              <SummaryField label="Normal prompt result" value={sub.normal_prompt_result} />
              <SummaryField label="Template prompt result" value={sub.template_prompt_result} />
            </>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Go back &amp; edit
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CongratsScreen({ teamName, questionTitle, onBack }) {
  return (
    <div className="page--narrow" style={{ margin: '8vh auto 0' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', lineHeight: 1 }}>🎉</div>
        <div className="eyebrow" style={{ marginTop: 10 }}>Submitted</div>
        <h1>Congratulations!</h1>
        <p className="muted">
          {teamName}'s answer for "{questionTitle}" has been submitted. Great
          work identifying whether AI applies, prompting normally, and
          comparing it against the template prompt.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onBack}>
          Back to Workspace
        </button>
      </div>
    </div>
  );
}

function CompareStep({ sub }) {
  return (
    <div>
      <h3>Compare the results</h3>
      <p className="muted">Which one worked better? Discuss as a team, then submit.</p>
      <div className="compare-columns">
        <div>
          <label>Normal prompt result</label>
          <div className="template-box" style={{ borderStyle: 'solid', minHeight: 140 }}>
            {sub.normal_prompt_result || <span className="muted">No result pasted yet.</span>}
          </div>
        </div>
        <div>
          <label>Template prompt result</label>
          <div className="template-box" style={{ borderStyle: 'solid', minHeight: 140 }}>
            {sub.template_prompt_result || <span className="muted">No result pasted yet.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
