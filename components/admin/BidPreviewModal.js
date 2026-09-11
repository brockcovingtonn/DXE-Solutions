'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import BidDocument from '@/components/admin/BidDocument';

export default function BidPreviewModal({ bidId, bid, lineItems, projectId, defaultRecipientEmail, onClose }) {
  const router = useRouter();
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function finalize(sendEmail) {
    if (sendEmail && !recipientEmail.trim()) {
      setError('Enter an email address to send the bid to.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/bids/${bidId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail, recipientEmail: recipientEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not finalize this bid.');
        setBusy(false);
        return;
      }
      router.push(`/admin/projects/${projectId}/bids/${bidId}/view`);
      router.refresh();
    } catch {
      setError('Could not finalize this bid.');
      setBusy(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,36,0.72)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2.5rem 1.5rem', overflowY: 'auto' }}
      onClick={onClose}
    >
      <div style={{ background: 'var(--cream, #F6F8FA)', borderRadius: '8px', width: '100%', maxWidth: '860px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(var(--border-rgb),0.12)' }}>
          <h3 style={{ margin: 0 }}>Preview bid</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: 'var(--text-secondary)' }}>
            <i className="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>

        <div style={{ padding: '1.5rem', maxHeight: '65vh', overflowY: 'auto', background: '#DCE5EC' }}>
          <BidDocument bid={bid} lineItems={lineItems} />
        </div>

        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(var(--border-rgb),0.12)' }}>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Send to (email)</label>
            <input
              className={adminStyles.fieldInput}
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          {error && <p className={adminStyles.formMsgError}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-navy" onClick={() => finalize(true)} disabled={busy}>
              {busy ? 'Sending…' : 'Confirm & Send'}
            </button>
            <button type="button" className={adminStyles.cancelBtn} onClick={() => finalize(false)} disabled={busy}>
              Save without emailing
            </button>
            <button type="button" className={adminStyles.cancelBtn} onClick={onClose} disabled={busy}>
              Back to editing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
