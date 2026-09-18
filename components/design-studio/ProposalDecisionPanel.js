'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, S } from '@/lib/design-studio/brand';
import SignaturePad from '@/components/SignaturePad';

/**
 * The client's Approve/Deny controls on the public proposal page.
 * Approving requires signing (SignaturePad, extended with `extraFields` to
 * carry `decision: 'accepted'` alongside the signature); denying is a
 * single click with an optional reason. Both post to the unauthenticated
 * app/api/proposal/[token]/decision route — the share token is the only
 * credential a client ever has here.
 */
export default function ProposalDecisionPanel({ shareToken, status, decidedAt }) {
  const router = useRouter();
  const [mode, setMode] = useState(null); // null | 'sign' | 'deny'
  const [declineReason, setDeclineReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(status === 'accepted' || status === 'declined' ? status : null);

  if (result === 'accepted') {
    return (
      <div className="ds-no-print" style={{ maxWidth: 780, margin: '0 auto 14px', ...banner(C.good) }}>
        You approved this proposal{decidedAt ? ` on ${new Date(decidedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}.
      </div>
    );
  }
  if (result === 'declined') {
    return (
      <div className="ds-no-print" style={{ maxWidth: 780, margin: '0 auto 14px', ...banner(C.warn) }}>
        You declined this proposal{decidedAt ? ` on ${new Date(decidedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}.
      </div>
    );
  }

  async function deny() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/proposal/${shareToken}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'declined', declineReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit your response.');
      setResult('declined');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ds-no-print" style={{ maxWidth: 780, margin: '0 auto 14px' }}>
      {mode === 'sign' ? (
        <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Sign to approve</div>
          <SignaturePad
            signUrl={`/api/proposal/${shareToken}/decision`}
            extraFields={{ decision: 'accepted' }}
            onCancel={() => setMode(null)}
            onSigned={() => {
              setResult('accepted');
              router.refresh();
            }}
          />
        </div>
      ) : mode === 'deny' ? (
        <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Decline this proposal</div>
          <textarea
            style={{ ...S.input, minHeight: 64, resize: 'vertical' }}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="button" style={S.btn} onClick={deny} disabled={busy}>
              {busy ? 'Submitting…' : 'Confirm decline'}
            </button>
            <button type="button" style={S.btnGhost} onClick={() => setMode(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" style={S.btnGhost} onClick={() => setMode('deny')}>
            Deny
          </button>
          <button type="button" style={S.btn} onClick={() => setMode('sign')}>
            Approve
          </button>
        </div>
      )}
      {error ? <div style={{ fontSize: 13, color: C.warn, marginTop: 8, textAlign: 'right' }}>{error}</div> : null}
    </div>
  );
}

function banner(color) {
  return {
    background: '#F6F8FA',
    border: `1px solid ${color}`,
    color,
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 13.5,
    textAlign: 'center',
    fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  };
}
