'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, S } from '@/lib/design-studio/brand';

// Mirrors SendProposalEmailModal.js — loads the exact composed email (same
// builder the send route uses) so what staff approves here is exactly what
// goes out.
export default function SendIntakeEmailModal({ quoteId, onClose }) {
  const router = useRouter();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/design-studio/quotes/${quoteId}/intake-email-preview`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load the email preview');
        if (!cancelled) setPreview(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  async function send() {
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/design-studio/quotes/${quoteId}/send-intake-email`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send this email');
      onClose();
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,36,0.72)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2.5rem 1.5rem', overflowY: 'auto' }}
      onClick={onClose}
    >
      <div style={{ background: C.paper, borderRadius: 8, width: '100%', maxWidth: 620, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Request more info</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted }}>
            ✕
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div style={{ ...S.small, textAlign: 'center', padding: '30px 0' }}>Loading preview…</div>
          ) : preview ? (
            <>
              <Row label="To" value={preview.to || '—'} />
              <Row label="Subject" value={preview.subject} />
              {!preview.to ? (
                <div style={{ fontSize: 12.5, color: C.warn, marginTop: 6 }}>
                  This quote has no client email on file — add one before sending.
                </div>
              ) : null}
              <div style={{ ...S.small, marginTop: 10, marginBottom: 4 }}>PREVIEW</div>
              <div
                style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, maxHeight: 420, overflowY: 'auto', background: C.sand }}
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            </>
          ) : null}

          {error ? <div style={{ fontSize: 13, color: C.warn, marginTop: 10 }}>{error}</div> : null}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              style={S.btn}
              onClick={send}
              disabled={sending || loading || !preview?.to}
            >
              {sending ? 'Sending…' : 'Confirm & send'}
            </button>
            <button type="button" style={S.btnGhost} onClick={onClose} disabled={sending}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, padding: '4px 0' }}>
      <span style={{ color: C.muted, minWidth: 60 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
