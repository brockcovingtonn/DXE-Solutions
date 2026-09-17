'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, S } from '@/lib/design-studio/brand';

// Dashboard-level lead capture — no existing quote required. Creates a
// design_studio_leads row and emails the intake-form link straight away;
// no preview step, unlike the (now-removed) quote-scoped intake email.
export default function SendIntakeFormModal({ onClose }) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function send() {
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/design-studio/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, email, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send the intake form.');
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,36,0.72)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2.5rem 1.5rem', overflowY: 'auto' }}
      onClick={onClose}
    >
      <div style={{ background: C.paper, borderRadius: 8, width: '100%', maxWidth: 440, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Send Intake Form</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted }}>
            ✕
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sent</div>
              <div style={{ ...S.small }}>They'll get an email with a link to fill out their project details.</div>
              <button type="button" style={{ ...S.btn, marginTop: 18 }} onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={S.label}>Full name</label>
                  <input style={S.input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Whitfield" />
                </div>
                <div>
                  <label style={S.label}>Phone</label>
                  <input style={S.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Email</label>
                  <input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
                <div>
                  <label style={S.label}>Address</label>
                  <input style={S.input} value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>

              {error ? <div style={{ fontSize: 13, color: C.warn, marginTop: 10 }}>{error}</div> : null}

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button type="button" style={S.btn} onClick={send} disabled={sending}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
                <button type="button" style={S.btnGhost} onClick={onClose} disabled={sending}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
