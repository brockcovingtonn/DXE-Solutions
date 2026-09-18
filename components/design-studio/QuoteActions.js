'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { C, S } from '@/lib/design-studio/brand';
import SendProposalEmailModal from './SendProposalEmailModal';

const FLOW = [
  { status: 'sent', label: 'Sent' },
  { status: 'accepted', label: 'Accepted' },
  { status: 'declined', label: 'Declined' },
];

export default function QuoteActions({ quote, canReprice }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [emailIntent, setEmailIntent] = useState(null); // null | 'send' | 'esign'

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/proposal/${quote.share_token}` : '';

  async function setStatus(status) {
    setBusy(status);
    setError('');
    try {
      const res = await fetch(`/api/design-studio/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function duplicate() {
    setBusy('duplicate');
    setError('');
    try {
      const res = await fetch(`/api/design-studio/quotes/${quote.id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Duplicate failed');
      router.push(`/design-studio/${data.quote.id}/edit`);
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Could not copy. The link is /proposal/' + quote.share_token);
    }
  }

  return (
    <div style={{ ...S.card, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginBottom: 0, padding: '14px 18px' }}>
      <span style={{ fontSize: 13, color: C.muted, textTransform: 'capitalize' }}>
        Status: <strong style={{ color: C.ink }}>{quote.status}</strong>
      </span>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FLOW.filter((f) => f.status !== quote.status).map((f) => (
          <button key={f.status} style={S.btnGhostSm} onClick={() => setStatus(f.status)} disabled={busy === f.status}>
            {busy === f.status ? '…' : f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button style={S.btnGhostSm} onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
        <a href={`/proposal/${quote.share_token}`} target="_blank" rel="noreferrer" style={{ ...S.btnGhostSm, textDecoration: 'none' }}>
          Open proposal
        </a>
        <button style={S.btnGhostSm} onClick={() => setEmailIntent('send')}>
          Send proposal
        </button>
        <button style={S.btnGhostSm} onClick={() => setEmailIntent('esign')}>
          Request e-sign
        </button>
      </div>

      {emailIntent ? (
        <SendProposalEmailModal
          quoteId={quote.id}
          intent={emailIntent === 'esign' ? 'esign' : undefined}
          onClose={() => setEmailIntent(null)}
        />
      ) : null}

      {quote.intake_submitted_at ? (
        <span style={{ fontSize: 12, color: C.muted }}>Intake received {new Date(quote.intake_submitted_at).toLocaleDateString()}</span>
      ) : null}

      <div style={{ marginLeft: 'auto' }}>
        {canReprice ? (
          <Link href={`/design-studio/${quote.id}/edit`} style={{ ...S.btnSm, textDecoration: 'none' }}>
            Re-price draft
          </Link>
        ) : (
          <button style={S.btnSm} onClick={duplicate} disabled={busy === 'duplicate'}>
            {busy === 'duplicate' ? '…' : 'Duplicate to edit'}
          </button>
        )}
      </div>

      {error ? <span style={{ fontSize: 13, color: C.warn, width: '100%' }}>{error}</span> : null}
    </div>
  );
}
