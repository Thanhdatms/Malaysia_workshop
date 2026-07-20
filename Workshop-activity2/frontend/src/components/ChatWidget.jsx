import { useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../api/client';

const WELCOME = {
  role: 'assistant',
  content:
    "Hi! I'm your AI workshop assistant. Ask me to help brainstorm process steps, pain points, AI agents, or how to design your workflow.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError('');
    try {
      const res = await sendChatMessage(nextMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setError(err.message || 'Could not reach the assistant.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget__panel">
          <div className="chat-widget__header">
            <span>AI Assistant</span>
            <button
              type="button"
              className="chat-widget__close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
          <div className="chat-widget__messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble chat-bubble--assistant chat-bubble--typing">
                Thinking…
              </div>
            )}
          </div>
          {error && (
            <p style={{ color: 'var(--red)', fontSize: '0.78rem', padding: '0 12px' }}>{error}</p>
          )}
          <form className="chat-widget__input-row" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask for help…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="chat-widget__button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle AI assistant"
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}
