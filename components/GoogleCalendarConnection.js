'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import adminStyles from '@/components/admin.module.css';

// Shared "Connect Google Calendar" status bar — used on both the admin
// and employee calendar pages. Each user connects their own Google
// account; events they create/are assigned to sync to their own
// calendar once connected.
export default function GoogleCalendarConnection({ googleConnected }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get('google');
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnectGoogle() {
    if (!confirm('Disconnect Google Calendar? Events already synced will stay on your Google Calendar, but new changes will stop syncing.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/admin/google-calendar/disconnect', { method: 'POST' });
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: 'var(--surface)',
          marginBottom: '1.5rem',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>
          <i className="ti ti-brand-google" style={{ marginRight: '0.5rem', color: googleConnected ? 'var(--text-success)' : 'var(--text-tertiary)' }} aria-hidden="true"></i>
          Google Calendar: <strong>{googleConnected ? 'Connected (two-way sync)' : 'Not connected'}</strong>
        </span>
        {googleConnected ? (
          <button type="button" onClick={handleDisconnectGoogle} disabled={disconnecting} className={adminStyles.cancelBtn}>
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <a href="/api/admin/google-calendar/connect" className="btn-navy" style={{ padding: '0.5rem 1.2rem', fontSize: '0.75rem' }}>
            Connect Google Calendar
          </a>
        )}
      </div>

      {googleStatus === 'connected' && (
        <p className={adminStyles.formMsgSuccess} style={{ marginBottom: '1rem' }}>Google Calendar connected.</p>
      )}
      {googleStatus === 'error' && (
        <p className={adminStyles.formMsgError} style={{ marginBottom: '1rem' }}>Could not connect Google Calendar. Please try again.</p>
      )}
    </>
  );
}
