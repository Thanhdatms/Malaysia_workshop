export const AGENT_SUGGESTIONS = [
  'Classification Agent',
  'Drafting / Generation Agent',
  'Summarization Agent',
  'OCR / Extraction Agent',
  'RAG / Knowledge Agent',
  'Approval Router',
  'Data Analysis Agent',
  'Translation Agent',
];

export default function EvaluateTable({ rows, onChange, readOnly = false }) {
  function updateRow(index, field, value) {
    onChange((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Step</th>
            <th style={{ width: '26%' }}>Data needed</th>
            <th style={{ width: '20%' }}>AI Agent</th>
            <th style={{ width: '10%' }}>Human-in-the-loop</th>
            <th style={{ width: '26%' }}>Notes for Step 4</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.process_step_id}>
              <td style={{ fontWeight: 600, color: 'var(--navy)' }}>
                {i + 1}. {row.step_name}
              </td>
              {readOnly ? (
                <>
                  <td>{row.data_needed || <span className="muted">—</span>}</td>
                  <td>{row.ai_agent || <span className="muted">—</span>}</td>
                  <td style={{ textAlign: 'center' }}>{row.human_in_the_loop ? '✓' : ''}</td>
                  <td>{row.notes_for_design || <span className="muted">—</span>}</td>
                </>
              ) : (
                <>
                  <td>
                    <textarea
                      className="cell-input cell-textarea"
                      value={row.data_needed}
                      placeholder="What data/inputs does this step need?"
                      onChange={(e) => updateRow(i, 'data_needed', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      list="agent-suggestions"
                      value={row.ai_agent}
                      placeholder="e.g. Classification Agent"
                      onChange={(e) => updateRow(i, 'ai_agent', e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={row.human_in_the_loop}
                      onChange={(e) => updateRow(i, 'human_in_the_loop', e.target.checked)}
                    />
                  </td>
                  <td>
                    <textarea
                      className="cell-input cell-textarea"
                      value={row.notes_for_design}
                      placeholder="Optional — sequencing hint, tool name, condition..."
                      onChange={(e) => updateRow(i, 'notes_for_design', e.target.value)}
                    />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <datalist id="agent-suggestions">
          {AGENT_SUGGESTIONS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
    </div>
  );
}

export function buildEvaluateRows(processSteps, evaluateSteps) {
  const byStep = new Map(evaluateSteps.map((e) => [e.process_step_id, e]));
  return processSteps.map((ps) => {
    const existing = byStep.get(ps.id);
    return {
      process_step_id: ps.id,
      step_name: ps.step_name || `Step ${ps.order_index + 1}`,
      data_needed: existing?.data_needed || '',
      ai_agent: existing?.ai_agent || '',
      human_in_the_loop: existing?.human_in_the_loop || false,
      notes_for_design: existing?.notes_for_design || '',
    };
  });
}
