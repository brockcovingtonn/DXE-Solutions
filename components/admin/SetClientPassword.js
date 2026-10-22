'use client';

import { useState } from 'react';
import adminStyles from '@/components/admin.module.css';

export default function SetClientPassword({ clientId }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function handleSet(e) {
    e.preventDefault();
    if (password !== confirm) return;

    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(data.error || 'Could not set the password.');
      } else {
        setIsError(false);
        setMessage('Password updated.');
        setPassword('');
        setConfirm('');
      }
    } catch {
      setIsError(true);
      setMessage('Could not set the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSet} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(var(--border-rgb),0.1)' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
        Set the client's portal password directly, without them needing to use a reset link.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
        <input
          type="password"
          className={adminStyles.fieldInput}
          style={{ width: '220px' }}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <input
          type="password"
          className={adminStyles.fieldInput}
          style={{ width: '220px' }}
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      {mismatch && (
        <p className={adminStyles.formMsgError} style={{ marginBottom: '0.85rem' }}>
          Passwords don't match.
        </p>
      )}
      <button
        type="submit"
        className="btn-navy"
        disabled={busy || !password || password.length < 8 || password !== confirm}
      >
        {busy ? 'Setting…' : 'Set password'}
      </button>
      {message && (
        <p className={isError ? adminStyles.formMsgError : adminStyles.formMsgSuccess} style={{ marginTop: '0.75rem' }}>
          {message}
        </p>
      )}
    </form>
  );
}
