'use client';

import { useState } from 'react';
import AssistantChat from '@/components/AssistantChat';

// Stacked directly above FloatingChat's icon (bottom-right), so the two
// floating buttons sit one above the other instead of overlapping.
export default function FloatingAssistant({ projects, initialProjectId }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        style={{
          position: 'fixed',
          bottom: '5.75rem',
          right: '1.5rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--gold)',
          color: 'var(--navy-dark)',
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
        <i className={`ti ${open ? 'ti-x' : 'ti-sparkles'}`} aria-hidden="true"></i>
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '9.5rem',
            right: '1.5rem',
            width: '380px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '540px',
            maxHeight: 'calc(100vh - 12rem)',
            background: 'var(--white)',
            border: '1px solid rgba(62,84,104,0.15)',
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
            <i className="ti ti-sparkles" aria-hidden="true" style={{ color: 'var(--gold)' }}></i>
            <span style={{ fontSize: '0.88rem', fontWeight: 500, flex: 1 }}>Assistant</span>
          </div>

          <div style={{ flex: 1, minHeight: 0, padding: '0.85rem', display: 'flex', flexDirection: 'column' }}>
            <AssistantChat projects={projects} initialProjectId={initialProjectId} compact />
          </div>
        </div>
      )}
    </>
  );
}
