'use client';

import { useState, useEffect } from 'react';
import ChatBox from '@/components/ChatBox';

// threads: [{ key, label, sublabel?, projectId?, dmUserId?, unread }]
// Exactly one of projectId/dmUserId per thread. A single-thread list
// (the client case) skips the picker and opens straight into the chat.
export default function FloatingChat({ currentUserId, threads }) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(threads.length === 1 ? threads[0].key : null);
  const [threadData, setThreadData] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeThread = threads.find((t) => t.key === activeKey);
  const totalUnread = threads.reduce((sum, t) => sum + (t.unread || 0), 0);

  useEffect(() => {
    if (!activeThread) {
      setThreadData(null);
      return;
    }
    let active = true;
    setLoading(true);
    const params = activeThread.projectId
      ? `projectId=${activeThread.projectId}`
      : `dmUserId=${activeThread.dmUserId}`;

    fetch(`/api/messages/thread?${params}`)
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
  }, [activeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectThread(key) {
    setActiveKey(key);
  }

  function backToList() {
    setActiveKey(null);
    setThreadData(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--navy)',
          color: 'var(--white)',
          border: 'none',
          boxShadow: '0 8px 24px rgba(44,62,80,0.35)',
          cursor: 'pointer',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
        }}
      >
        <i className={`ti ${open ? 'ti-x' : 'ti-message-circle'}`} aria-hidden="true"></i>
        {!open && totalUnread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--gold)',
              color: 'var(--navy-dark)',
              fontSize: '0.68rem',
              fontWeight: 700,
              minWidth: '20px',
              height: '20px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 0.3rem',
            }}
          >
            {totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.25rem',
            right: '1.5rem',
            width: '350px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '500px',
            maxHeight: 'calc(100vh - 8rem)',
            background: 'var(--white)',
            border: '1px solid rgba(var(--border-rgb),0.15)',
            boxShadow: '0 20px 50px rgba(44,62,80,0.25)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.85rem 1rem',
              background: 'var(--navy)',
              color: 'var(--white)',
              flexShrink: 0,
            }}
          >
            {threads.length > 1 && activeKey && (
              <button
                type="button"
                onClick={backToList}
                aria-label="Back to conversations"
                style={{ background: 'none', border: 'none', color: 'var(--white)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
              >
                <i className="ti ti-arrow-left" aria-hidden="true"></i>
              </button>
            )}
            <span style={{ fontSize: '0.88rem', fontWeight: 500, flex: 1 }}>
              {activeThread ? activeThread.label : 'Messages'}
            </span>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', padding: activeThread ? '0.85rem' : '0', display: 'flex', flexDirection: 'column' }}>
            {!activeThread ? (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {threads.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', padding: '1rem' }}>No conversations yet.</p>
                ) : (
                  threads.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => selectThread(t.key)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.8rem 1rem',
                        border: 'none',
                        borderBottom: '1px solid rgba(var(--border-rgb),0.08)',
                        background: 'var(--white)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>
                        <div style={{ fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 500 }}>{t.label}</div>
                        {t.sublabel && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{t.sublabel}</div>}
                      </span>
                      {t.unread > 0 && (
                        <span
                          style={{
                            background: 'var(--gold)',
                            color: 'var(--navy-dark)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            minWidth: '18px',
                            height: '18px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 0.3rem',
                          }}
                        >
                          {t.unread}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            ) : loading ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Loading...</p>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <ChatBox
                  key={activeThread.key}
                  projectId={activeThread.projectId}
                  dmUserId={activeThread.dmUserId}
                  initialMessages={threadData?.messages || []}
                  participants={threadData?.participants || []}
                  currentUserId={currentUserId}
                  compact
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
