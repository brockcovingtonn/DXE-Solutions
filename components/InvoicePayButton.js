'use client';

import { useState } from 'react';

export default function InvoicePayButton({ invoiceId, small, preview }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function pay() {
    if (preview) {
      setNote('Online payments aren’t live yet — this is a preview of how it’ll look.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not start the payment.');
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not start the payment.');
      setBusy(false);
    }
  }

  return (
    <div style={{ flexShrink: 0, textAlign: 'right' }}>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="btn-navy"
        style={{ padding: small ? '0.35rem 0.75rem' : '0.5rem 1rem', fontSize: '0.75rem', whiteSpace: 'nowrap', opacity: preview ? 0.85 : 1 }}
      >
        {busy ? 'Redirecting…' : 'Pay now'}
      </button>
      {preview && (
        <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Preview
        </div>
      )}
      {note && (
        <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '0.3rem', maxWidth: '180px' }}>
          {note}
        </div>
      )}
      {error && (
        <div style={{ fontSize: '0.68rem', color: 'var(--text-error)', marginTop: '0.3rem', maxWidth: '160px' }}>
          {error}
        </div>
      )}
    </div>
  );
}
