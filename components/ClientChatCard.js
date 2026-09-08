'use client';

import { useState, useEffect } from 'react';
import ChatBox from '@/components/ChatBox';

// The client's main chat entry point defaults to a general DM with
// Dixie (the master/admin account) but can be pointed at a specific
// project's group thread instead — the same project_id-scoped
// messages table admin/employee already use, just newly exposed here.
export default function ClientChatCard({ currentUserId, projects, initialMessages, initialParticipants }) {
  const [selection, setSelection] = useState('general');
  const [threadData, setThreadData] = useState({ messages: initialMessages, participants: initialParticipants });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selection === 'general') {
      setThreadData({ messages: initialMessages, participants: initialParticipants });
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/messages/thread?projectId=${selection}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setThreadData(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {projects && projects.length > 0 && (
        <select
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          style={{
            marginBottom: '0.75rem',
            border: '1px solid rgba(var(--border-rgb),0.2)',
            background: 'var(--white)',
            color: 'var(--navy)',
            padding: '0.5rem 0.65rem',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.82rem',
            flexShrink: 0,
          }}
        >
          <option value="general">General — Chat with Dixie</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Loading...</p>
        ) : (
          <ChatBox
            key={selection}
            dmUserId={selection === 'general' ? currentUserId : undefined}
            projectId={selection === 'general' ? undefined : selection}
            initialMessages={threadData.messages || []}
            participants={threadData.participants || []}
            currentUserId={currentUserId}
            compact
          />
        )}
      </div>
    </div>
  );
}
