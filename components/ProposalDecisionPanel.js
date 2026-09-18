'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SignaturePad from '@/components/SignaturePad';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const btn = { padding: '10px 18px', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'var(--navy)', color: '#fff' };
const btnGhost = { ...btn, background: 'transparent', color: 'var(--navy)', border: '1px solid var(--border)' };

/**
 * The client's Approve/Deny controls on a proposal's portal detail page.
 * Mirrors components/design-studio/ProposalDecisionPanel.js's shape, but
 * wired to the routes that already exist for general Proposals — Approve
 * reuses the existing authenticated /sign route + SignaturePad untouched;
 * Deny posts to the new /decline route.
 */
export default function ProposalDecisionPanel({ proposalId, initialSignature, initialDecline, defaultName }) {
  const router = useRouter();
  const [mode, setMode] = useState(null); // null | 'sign' | 'deny'
  const [declineReason, setDeclineReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [localDecline, setLocalDecline] = useState(null);

  // `initialSignature` is read straight from the prop (not seeded into
  // local state) so that after router.refresh() re-fetches it server-side,
  // this component picks up the fresh value on its next render — the same
  // "signature never showed up until I added a refresh" bug the Design
  // Studio version hit is avoided by not shadowing it with stale state.
  const signature = initialSignature;
  const decline = initialDecline || localDecline;

  if (signature) {
    return (
      <div style={banner('var(--text-success, #065F46)')}>
        Approved &amp; signed by {signature.signer_name} on {formatDate(signature.created_at)}.
      </div>
    );
  }
  if (decline) {
    return (
      <div style={banner('var(--warn, #A8562F)')}>
        Declined on {formatDate(decline.created_at)}{decline.reason ? ` — ${decline.reason}` : ''}.
      </div>
    );
  }

  async function submitDecline() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/proposals/${proposalId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit your response.');
      setLocalDecline(data.decline);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {mode === 'sign' ? (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Sign to approve</div>
          <SignaturePad
            signUrl={`/api/proposals/${proposalId}/sign`}
            defaultName={defaultName}
            onCancel={() => setMode(null)}
            onSigned={() => {
              router.refresh();
              setMode(null);
            }}
          />
        </div>
      ) : mode === 'deny' ? (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Decline this proposal</div>
          <textarea
            style={{ width: '100%', minHeight: 64, resize: 'vertical', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 15, boxSizing: 'border-box' }}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="button" style={btn} onClick={submitDecline} disabled={busy}>
              {busy ? 'Submitting…' : 'Confirm decline'}
            </button>
            <button type="button" style={btnGhost} onClick={() => setMode(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" style={btnGhost} onClick={() => setMode('deny')}>
            Deny
          </button>
          <button type="button" style={btn} onClick={() => setMode('sign')}>
            Approve
          </button>
        </div>
      )}
      {error ? <div style={{ fontSize: 13, color: 'var(--warn, #A8562F)', marginTop: 8, textAlign: 'right' }}>{error}</div> : null}
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
    marginBottom: 14,
  };
}
