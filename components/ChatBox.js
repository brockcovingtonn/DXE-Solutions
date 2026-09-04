'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Either projectId (group thread) or dmUserId (direct thread with admin)
// must be set — never both.
export default function ChatBox({ projectId, dmUserId, initialMessages, currentUserId, participants, compact }) {
  const supabase = createClient();
  const [messages, setMessages] = useState(initialMessages || []);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [reads, setReads] = useState({});
  const listRef = useRef(null);

  const threadType = projectId ? 'project' : 'dm';
  const threadId = projectId || dmUserId;
  const roster = participants || [];
  const others = roster.filter((p) => p.id !== currentUserId);

  // Reset local state when switching threads (e.g. picking a different
  // project or "Dixie" in the widget).
  useEffect(() => {
    setMessages(initialMessages || []);
  }, [threadType, threadId, initialMessages]);

  // Realtime: new messages, read-receipt updates, and presence — all on
  // one channel scoped to this thread.
  useEffect(() => {
    const filter = projectId ? `project_id=eq.${projectId}` : `dm_user_id=eq.${dmUserId}`;
    const channel = supabase.channel(`messages:${threadType}:${threadId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, (payload) => {
        // DM rows share the same dm_user_id regardless of project_id
        // being null, so the filter alone is enough to scope this.
        setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reads', filter }, (payload) => {
        const row = payload.new;
        if (row) setReads((prev) => ({ ...prev, [row.user_id]: row.last_read_at }));
      })
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadType, threadId, currentUserId]);

  // Initial read-state for everyone on this thread (for "Read" receipts).
  useEffect(() => {
    let active = true;
    let query = supabase.from('message_reads').select('*');
    query = projectId ? query.eq('project_id', projectId) : query.eq('dm_user_id', dmUserId);
    query.then(({ data }) => {
      if (!active) return;
      const map = {};
      (data || []).forEach((r) => {
        map[r.user_id] = r.last_read_at;
      });
      setReads(map);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadType, threadId]);

  // Mark read on mount and whenever a new message arrives while this is open.
  useEffect(() => {
    if (messages.length === 0) return;
    const now = new Date().toISOString();
    supabase
      .from('message_reads')
      .upsert({
        project_id: projectId || null,
        dm_user_id: dmUserId || null,
        user_id: currentUserId,
        last_read_at: now,
      })
      .then(() => setReads((prev) => ({ ...prev, [currentUserId]: now })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, threadType, threadId, currentUserId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const myMessages = messages.filter((m) => m.sender_id === currentUserId);
  const lastMineId = myMessages.length > 0 ? myMessages[myMessages.length - 1].id : null;
  const lastMine = myMessages[myMessages.length - 1];
  const readByOther =
    lastMine && others.some((p) => reads[p.id] && new Date(reads[p.id]) >= new Date(lastMine.created_at));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;

    setSending(true);
    setError('');
    const body = text.trim();

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectId ? { projectId, text: body } : { dmUserId, text: body }),
      });

      if (!res.ok) throw new Error();

      setText('');
    } catch {
      setError('Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={compact ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } : undefined}>
      {others.length > 0 && (
        <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', marginBottom: '0.75rem', flexShrink: 0 }}>
          {others.map((p) => (
            <span key={p.id} style={{ fontSize: '0.72rem', color: '#718096', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: onlineIds.has(p.id) ? '#22c55e' : '#cbd5e0',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
                title={onlineIds.has(p.id) ? 'Online' : 'Offline'}
              />
              {p.first_name} {p.last_name}
            </span>
          ))}
        </div>
      )}

      <div
        ref={listRef}
        style={{
          ...(compact ? { flex: 1, minHeight: 0 } : { height: '360px' }),
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          padding: '1rem',
          background: 'var(--cream)',
          border: '1px solid rgba(62,84,104,0.1)',
        }}
      >
        {messages.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: '#a0aec0', margin: 'auto' }}>
            No messages yet. Say hello.
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          const isTeam = m.sender_role === 'admin' || m.sender_role === 'employee';
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '75%' }}>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: isTeam ? 'var(--gold)' : '#718096',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '0.2rem',
                    textAlign: isMine ? 'right' : 'left',
                  }}
                >
                  {isMine ? 'You' : m.sender_name}
                </div>
                <div
                  style={{
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    background: isMine ? 'var(--navy)' : 'var(--white)',
                    color: isMine ? 'var(--white)' : 'var(--navy)',
                    border: isMine ? 'none' : '1px solid rgba(62,84,104,0.1)',
                  }}
                >
                  {m.body}
                </div>
                <div
                  style={{
                    fontSize: '0.62rem',
                    color: '#a0aec0',
                    marginTop: '0.2rem',
                    textAlign: isMine ? 'right' : 'left',
                  }}
                >
                  {formatTime(m.created_at)}
                  {isMine && m.id === lastMineId && (
                    <span style={{ marginLeft: '0.4rem', color: readByOther ? 'var(--gold)' : '#a0aec0' }}>
                      {readByOther ? '✓✓ Read' : '✓ Sent'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.6rem', marginTop: '0.85rem', flexShrink: 0 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message..."
          disabled={sending}
          style={{
            flex: 1,
            border: '1px solid rgba(62,84,104,0.2)',
            background: 'var(--white)',
            color: 'var(--navy)',
            padding: '0.65rem 0.85rem',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
        <button type="submit" className="btn-navy" disabled={sending || !text.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
      {error && <p style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
