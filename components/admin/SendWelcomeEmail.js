'use client';

import { useState } from 'react';
import adminStyles from '@/components/admin.module.css';

export default function SendWelcomeEmail({ clientId }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function handleSend() {
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/welcome-email`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(data.error || 'Could not send the email.');
      } else {
        setMessage(`Welcome email sent to ${data.sentTo}.`);
      }
    } catch {
      setIsError(true);
      setMessage('Could not send the email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
        Emails the client to let them know their portal is ready, with their login
        email and a link to set their password.
      </p>
      <button type="button" className="btn-navy" onClick={handleSend} disabled={busy}>
        {busy ? 'Sending…' : 'Send portal welcome email'}
      </button>
      {message && (
        <p className={isError ? adminStyles.formMsgError : adminStyles.formMsgSuccess} style={{ marginTop: '0.75rem' }}>
          {message}
        </p>
      )}
    </div>
  );
}
