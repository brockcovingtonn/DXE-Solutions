'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
export default function ChatBox({ projectId, dmUserId, initialMessages, currentUserId, participants, compact, onRead }) {
  const supabase = createClient();
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages || []);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [reads, setReads] = useState({});
  const [attachmentUrls, setAttachmentUrls] = useState({});
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

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
      .upsert(
        {
          project_id: projectId || null,
          dm_user_id: dmUserId || null,
          user_id: currentUserId,
          last_read_at: now,
        },
        { onConflict: 'project_key,dm_key,user_id' }
      )
      .then(({ error }) => {
        if (error) {
          console.error('Failed to mark thread read:', error);
          return;
        }
        setReads((prev) => ({ ...prev, [currentUserId]: now }));
        onRead?.();
        // Unread badges (sidebar, floating chat, tab counts) are computed
        // server-side and handed down as props — refresh so they resync
        // now that this thread is marked read.
        router.refresh();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, threadType, threadId, currentUserId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Signed URLs for any attachments we don't already have one for.
  useEffect(() => {
    const missing = messages.filter((m) => m.attachment_path && !attachmentUrls[m.id]);
    if (missing.length === 0) return;
    let active = true;
    Promise.all(
      missing.map(async (m) => {
        const { data } = await supabase.storage.from('chat-attachments').createSignedUrl(m.attachment_path, 3600);
        return [m.id, data?.signedUrl];
      })
    ).then((pairs) => {
      if (!active) return;
      setAttachmentUrls((prev) => {
        const next = { ...prev };
        pairs.forEach(([id, url]) => {
          if (url) next[id] = url;
        });
        return next;
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Append immediately rather than waiting for the Realtime echo —
      // that round trip (insert -> broadcast -> subscriber) was showing
      // up as a visible delay before the sender's own message appeared.
      const { message } = await res.json();
      if (message) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      }
      setText('');
    } catch {
      setError('Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setSending(true);
    setError('');

    try {
      const folder = projectId ? `project/${projectId}` : `dm/${dmUserId}`;
      const filePath = `${folder}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
      if (uploadError) throw uploadError;

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(projectId ? { projectId } : { dmUserId }),
          text: '',
          attachmentPath: filePath,
          attachmentName: file.name,
          attachmentType: file.type,
        }),
      });

      if (!res.ok) throw new Error();

      const { message } = await res.json();
      if (message) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      }
    } catch {
      setError('Could not send attachment. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={compact ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } : undefined}>
      {others.length > 0 && (
        <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', marginBottom: '0.75rem', flexShrink: 0 }}>
          {others.map((p) => (
            <span key={p.id} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: onlineIds.has(p.id) ? '#22c55e' : 'var(--text-faint)',
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
          border: '1px solid rgba(var(--border-rgb),0.1)',
        }}
      >
        {messages.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 'auto' }}>
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
                    color: isTeam ? 'var(--gold)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '0.2rem',
                    textAlign: isMine ? 'right' : 'left',
                  }}
                >
                  {isMine ? 'You' : m.sender_name}
                </div>
                {m.attachment_path && (
                  <div style={{ marginBottom: m.body ? '0.4rem' : 0 }}>
                    {m.attachment_type?.startsWith('image/') ? (
                      <a href={attachmentUrls[m.id] || '#'} target="_blank" rel="noopener noreferrer">
                        <img
                          src={attachmentUrls[m.id]}
                          alt={m.attachment_name || 'Attachment'}
                          style={{ maxWidth: '220px', maxHeight: '220px', display: 'block', border: '1px solid rgba(var(--border-rgb),0.1)' }}
                        />
                      </a>
                    ) : (
                      <a
                        href={attachmentUrls[m.id] || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.8rem',
                          background: isMine ? 'rgba(255,255,255,0.12)' : 'var(--cream)',
                          color: isMine ? 'var(--white)' : 'var(--navy)',
                          border: isMine ? 'none' : '1px solid rgba(var(--border-rgb),0.1)',
                          textDecoration: 'none',
                        }}
                      >
                        📎 {m.attachment_name || 'Attachment'}
                      </a>
                    )}
                  </div>
                )}
                {m.body && (
                  <div
                    style={{
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      background: isMine ? 'var(--navy)' : 'var(--white)',
                      color: isMine ? 'var(--white)' : 'var(--navy)',
                      border: isMine ? 'none' : '1px solid rgba(var(--border-rgb),0.1)',
                    }}
                  >
                    {m.body}
                  </div>
                )}
                <div
                  style={{
                    fontSize: '0.62rem',
                    color: 'var(--text-tertiary)',
                    marginTop: '0.2rem',
                    textAlign: isMine ? 'right' : 'left',
                  }}
                >
                  {formatTime(m.created_at)}
                  {isMine && m.id === lastMineId && (
                    <span style={{ marginLeft: '0.4rem', color: readByOther ? 'var(--gold)' : 'var(--text-tertiary)' }}>
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
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          title="Attach a file"
          style={{
            border: '1px solid rgba(var(--border-rgb),0.2)',
            background: 'var(--white)',
            color: 'var(--navy)',
            padding: '0 0.75rem',
            fontSize: '1rem',
            cursor: sending ? 'default' : 'pointer',
          }}
        >
          📎
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message..."
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
        <button type="submit" className="btn-navy" disabled={sending || !text.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
      {error && <p style={{ fontSize: '0.78rem', color: 'var(--text-error)', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
