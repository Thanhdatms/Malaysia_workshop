import { useState } from 'react';
import { sendChatMessage } from '../api/client';

/**
 * Self-contained AI chat, mounted with `key={questionId}` by the caller so a
 * fresh instance (no history) is created whenever the question/section
 * changes. Nothing here is persisted — state lives only in memory.
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState([]);

  async function handleAsk(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;
    const entryId = Date.now();
    setEntries((prev) => [{ id: entryId, question, answer: '', loading: true, error: '' }, ...prev]);
    setInput('');
    try {
      const res = await sendChatMessage(question);
      setEntries((prev) =>
        prev.map((it) => (it.id === entryId ? { ...it, answer: res.reply, loading: false } : it))
      );
    } catch (err) {
      setEntries((prev) =>
        prev.map((it) => (it.id === entryId ? { ...it, error: err.message, loading: false } : it))
      );
    }
  }

  return (
    <>
      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-panel__header">
            <strong>Ask AI</strong>
            <span className="muted" style={{ fontSize: '0.75rem' }}>
              Each question here is independent — nothing is saved as history.
            </span>
          </div>

          <div className="chat-panel__body">
            {entries.length === 0 && (
              <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                Type a question below — e.g. paste your data and ask the AI to
                analyze or summarize it, right here without leaving the app.
              </p>
            )}
            {entries.map((entry) => (
              <div key={entry.id} className="chat-entry">
                <div className="chat-entry__question">{entry.question}</div>
                {entry.loading && <div className="muted chat-entry__loading">Thinking…</div>}
                {entry.error && <div className="chat-entry__error">{entry.error}</div>}
                {entry.answer && (
                  <div className="chat-entry__answer">
                    {entry.answer}
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginTop: 8, padding: '4px 10px', fontSize: '0.75rem' }}
                        onClick={() => navigator.clipboard.writeText(entry.answer)}
                      >
                        Copy answer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form className="chat-panel__input" onSubmit={handleAsk}>
            <textarea
              rows={3}
              placeholder="Type your question or paste data + instructions…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk(e);
                }
              }}
            />
            <button className="btn btn-primary" type="submit" disabled={!input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
