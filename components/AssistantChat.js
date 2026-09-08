'use client';

import { useState, useRef, useEffect } from 'react';
import adminStyles from '@/components/admin.module.css';

function extractText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

function displayableTurns(messages) {
  return messages
    .map((m) => ({ role: m.role, text: extractText(m.content) }))
    .filter((m) => m.text.trim().length > 0);
}

export default function AssistantChat({ projects, initialProjectId, compact }) {
  const [projectId, setProjectId] = useState(initialProjectId || '');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, projectId: projectId || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      setMessages(data.messages);
    } catch (err) {
      setError(err.message || 'Could not reach the assistant.');
    } finally {
      setSending(false);
    }
  }

  const turns = displayableTurns(messages);

  return (
    <div style={compact ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } : { display: 'flex', flexDirection: 'column', height: '70vh', maxHeight: '720px' }}>
      {projects && projects.length > 1 && (
        <div style={{ marginBottom: compact ? '0.75rem' : '1rem', flexShrink: 0 }}>
          <select
            className={adminStyles.fieldInput}
            style={compact ? { width: '100%' } : { maxWidth: '320px' }}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No project selected</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          padding: compact ? '0.85rem' : '1.25rem',
          background: 'var(--cream)',
          border: '1px solid rgba(var(--border-rgb),0.1)',
        }}
      >
        {turns.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 'auto', textAlign: 'center', maxWidth: '320px' }}>
            Ask about a project, have it create or update an action item or calendar event, or generate a document
            from a template.
          </p>
        )}
        {turns.map((turn, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: turn.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '80%',
                padding: '0.65rem 0.9rem',
                fontSize: '0.88rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                background: turn.role === 'user' ? 'var(--navy)' : 'var(--white)',
                color: turn.role === 'user' ? 'var(--white)' : 'var(--navy)',
                border: turn.role === 'user' ? 'none' : '1px solid rgba(var(--border-rgb),0.1)',
              }}
            >
              {turn.text}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '0.65rem 0.9rem',
                fontSize: '0.85rem',
                color: 'var(--text-tertiary)',
                background: 'var(--white)',
                border: '1px solid rgba(var(--border-rgb),0.1)',
              }}
            >
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.6rem', marginTop: '0.85rem', flexShrink: 0 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant..."
          disabled={sending}
          style={{
            flex: 1,
            border: '1px solid rgba(var(--border-rgb),0.2)',
            background: 'var(--white)',
            color: 'var(--navy)',
            padding: '0.65rem 0.85rem',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
        <button type="submit" className="btn-navy" disabled={sending || !input.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
      {error && <p className={adminStyles.formMsgError} style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
