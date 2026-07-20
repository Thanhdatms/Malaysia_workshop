function emptyRow(orderIndex) {
  return {
    id: null,
    order_index: orderIndex,
    step_name: '',
    owner: '',
    time_per_step: '',
    problem: '',
    risk: '',
  };
}

export default function ProcessStepTable({ steps, onChange, mode, readOnly = false }) {
  const showPainColumns = mode === 'identify' || readOnly;

  function updateRow(index, field, value) {
    const next = steps.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    onChange(next);
  }

  function addRow() {
    onChange([...steps, emptyRow(steps.length)]);
  }

  function deleteRow(index) {
    const next = steps.filter((_, i) => i !== index).map((row, i) => ({ ...row, order_index: i }));
    onChange(next);
  }

  function toggleNone(index, field, noneText) {
    const current = steps[index][field];
    updateRow(index, field, current === noneText ? '' : noneText);
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: '24%' }}>Step</th>
            <th style={{ width: '18%' }}>Owner</th>
            <th style={{ width: '14%' }}>Time per step</th>
            {showPainColumns && <th style={{ width: '20%' }}>Problem</th>}
            {showPainColumns && <th style={{ width: '20%' }}>Risk</th>}
            {!readOnly && <th style={{ width: 36 }} />}
          </tr>
        </thead>
        <tbody>
          {steps.map((row, i) =>
            readOnly ? (
              <tr key={row.id ?? `new-${i}`}>
                <td style={{ fontWeight: 600, color: 'var(--navy)' }}>
                  {row.step_name || <span className="muted">—</span>}
                </td>
                <td>{row.owner || <span className="muted">—</span>}</td>
                <td>{row.time_per_step || <span className="muted">—</span>}</td>
                <td>{row.problem || <span className="muted">—</span>}</td>
                <td>{row.risk || <span className="muted">—</span>}</td>
              </tr>
            ) : (
              <tr key={row.id ?? `new-${i}`}>
                <td>
                  <input
                    className="cell-input"
                    value={row.step_name}
                    placeholder={`Step ${i + 1}`}
                    onChange={(e) => updateRow(i, 'step_name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={row.owner}
                    placeholder="Who owns this step?"
                    onChange={(e) => updateRow(i, 'owner', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={row.time_per_step}
                    placeholder="e.g. 15 min"
                    onChange={(e) => updateRow(i, 'time_per_step', e.target.value)}
                  />
                </td>
                {mode === 'identify' && (
                  <td>
                    <label className="no-problem-toggle">
                      <input
                        type="checkbox"
                        checked={row.problem === 'No problem'}
                        onChange={() => toggleNone(i, 'problem', 'No problem')}
                      />
                      No problem
                    </label>
                    {row.problem !== 'No problem' && (
                      <textarea
                        className="cell-input cell-textarea"
                        value={row.problem}
                        placeholder="Describe the problem (slow, error-prone, manual...)"
                        onChange={(e) => updateRow(i, 'problem', e.target.value)}
                      />
                    )}
                  </td>
                )}
                {mode === 'identify' && (
                  <td>
                    <label className="no-problem-toggle">
                      <input
                        type="checkbox"
                        checked={row.risk === 'No risk'}
                        onChange={() => toggleNone(i, 'risk', 'No risk')}
                      />
                      No risk
                    </label>
                    {row.risk !== 'No risk' && (
                      <textarea
                        className="cell-input cell-textarea"
                        value={row.risk}
                        placeholder="Describe the risk at this step"
                        onChange={(e) => updateRow(i, 'risk', e.target.value)}
                      />
                    )}
                  </td>
                )}
                <td>
                  <button
                    type="button"
                    className="row-delete-btn"
                    title="Delete step"
                    onClick={() => deleteRow(i)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            )
          )}
          {steps.length === 0 && (
            <tr>
              <td colSpan={showPainColumns ? 6 : 4} className="muted" style={{ padding: 16 }}>
                No steps yet{!readOnly && ' — add your first process step below'}.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!readOnly && (
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
            + Add step
          </button>
        </div>
      )}
    </div>
  );
}
