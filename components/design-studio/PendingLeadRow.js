'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, S } from '@/lib/design-studio/brand';

export default function PendingLeadRow({ lead }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function resend() {
    setBusy('resend');
    setMessage('');
    try {
      const res = await fetch(`/api/design-studio/leads/${lead.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resend.');
      setMessage('Resent');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  }

  async function dismiss() {
    if (!confirm(`Dismiss the lead for ${lead.full_name || lead.email}? This can't be undone.`)) return;
    setBusy('dismiss');
    try {
      const res = await fetch(`/api/design-studio/leads/${lead.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not dismiss.');
      router.refresh();
    } catch (err) {
      setMessage(err.message);
      setBusy('');
    }
  }

  return (
    <tr style={{ borderTop: `1px solid ${C.line}` }}>
      <td style={{ padding: '11px 10px 11px 0' }}>{lead.full_name || '—'}</td>
      <td style={{ padding: '11px 10px' }}>
        {lead.email || '—'}
        <div style={{ fontSize: 12, color: C.muted }}>{lead.phone || ''}</div>
      </td>
      <td style={{ padding: '11px 10px', color: C.muted }}>{lead.project_address || '—'}</td>
      <td style={{ padding: '11px 10px', color: C.muted, fontSize: 13 }}>
        {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </td>
      <td style={{ padding: '11px 0 11px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {message ? <span style={{ fontSize: 12, color: C.muted, marginRight: 8 }}>{message}</span> : null}
        <button type="button" onClick={resend} disabled={busy !== ''} style={{ ...S.btnGhost, fontSize: 12.5, padding: '5px 10px', marginRight: 6 }}>
          {busy === 'resend' ? '…' : 'Resend'}
        </button>
        <button type="button" onClick={dismiss} disabled={busy !== ''} style={{ ...S.btnGhost, fontSize: 12.5, padding: '5px 10px' }}>
          {busy === 'dismiss' ? '…' : 'Dismiss'}
        </button>
      </td>
    </tr>
  );
}
