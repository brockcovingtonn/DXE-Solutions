'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProposalViewActions({ proposalId, projectId, hasPdf, visibleToClient }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(!!visibleToClient);

  async function duplicate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/proposals/${proposalId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.proposal) {
        router.push(`/admin/projects/${projectId}/proposals/${data.proposal.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible() {
    setBusy(true);
    try {
      const next = !visible;
      await fetch(`/api/admin/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_to_client: next }),
      });
      setVisible(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={toggleVisible}
        disabled={busy}
        className="btn-navy"
        style={{ background: 'none', border: '1px solid var(--navy)', color: visible ? 'var(--text-success)' : 'var(--navy)' }}
      >
        <i className={`ti ${visible ? 'ti-eye' : 'ti-eye-off'}`} aria-hidden="true" style={{ marginRight: '0.4rem' }}></i>
        {visible ? 'Shared with client' : 'Not shared with client'}
      </button>
      {hasPdf && (
        <a href={`/api/admin/proposals/${proposalId}/download`} className="btn-navy">
          <i className="ti ti-download" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i> Download PDF
        </a>
      )}
      <button type="button" className="btn-navy" onClick={duplicate} disabled={busy} style={{ background: 'none', border: '1px solid var(--navy)', color: 'var(--navy)' }}>
        <i className="ti ti-copy" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i> {busy ? 'Duplicating…' : 'Duplicate as new draft'}
      </button>
    </div>
  );
}
