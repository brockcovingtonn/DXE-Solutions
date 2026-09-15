'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { C, S } from '@/lib/design-studio/brand';

const FLOW = [
  { status: 'sent', label: 'Mark sent' },
  { status: 'accepted', label: 'Mark accepted' },
  { status: 'declined', label: 'Mark declined' },
];

export default function QuoteActions({ quote, canReprice }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

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
    <div style={{ ...S.card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 0 }}>
      <span style={{ fontSize: 13, color: C.muted, marginRight: 4, textTransform: 'capitalize' }}>
        Status: <strong style={{ color: C.ink }}>{quote.status}</strong>
      </span>
      {FLOW.filter((f) => f.status !== quote.status).map((f) => (
        <button key={f.status} style={S.btnGhost} onClick={() => setStatus(f.status)} disabled={busy === f.status}>
          {busy === f.status ? '…' : f.label}
        </button>
      ))}
      <button style={S.btnGhost} onClick={copyLink}>
        {copied ? 'Link copied' : 'Copy client link'}
      </button>
      <a href={`/proposal/${quote.share_token}`} target="_blank" rel="noreferrer" style={{ ...S.btnGhost, textDecoration: 'none' }}>
        Open proposal
      </a>
      {canReprice ? (
        <Link href={`/design-studio/${quote.id}/edit`} style={{ ...S.btn, textDecoration: 'none' }}>
          Re-price draft
        </Link>
      ) : (
        <button style={S.btn} onClick={duplicate} disabled={busy === 'duplicate'}>
          {busy === 'duplicate' ? '…' : 'Duplicate to edit'}
        </button>
      )}
      {error ? <span style={{ fontSize: 13, color: C.warn }}>{error}</span> : null}
    </div>
  );
}
