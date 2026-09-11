'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLE = {
  draft: { bg: 'rgba(201,168,87,0.15)', color: '#7a5c0a', label: 'Draft' },
  finalized: { bg: 'rgba(62,84,104,0.12)', color: 'var(--navy)', label: 'Finalized' },
  sent: { bg: 'rgba(16,185,129,0.12)', color: 'var(--text-success)', label: 'Sent' },
};

function ProposalRow({ proposal, projectId, busy, onDelete, onDuplicate, onToggleVisible }) {
  const s = STATUS_STYLE[proposal.status] || STATUS_STYLE.draft;
  const href = proposal.status === 'draft' ? `/admin/projects/${projectId}/proposals/${proposal.id}` : `/admin/projects/${projectId}/proposals/${proposal.id}/view`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid rgba(var(--border-rgb),0.12)', opacity: busy ? 0.6 : 1, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', background: s.bg, color: s.color, flexShrink: 0 }}>
        {s.label}
      </span>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <Link href={href} style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--navy)' }}>
          {proposal.title}
        </Link>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
          {proposal.status === 'draft' ? `Last edited ${formatDate(proposal.updated_at)}` : proposal.status === 'sent' ? `Sent ${formatDate(proposal.sent_at)} to ${proposal.sent_to_email || ''}` : `Finalized ${formatDate(proposal.finalized_at)}`}
          {proposal.status !== 'draft' && proposal.visible_to_client && <> · <span style={{ color: 'var(--text-success)' }}>Shared with client</span></>}
        </div>
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>{formatCurrency(proposal.total)}</div>
      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
        {proposal.status === 'draft' ? (
          <Link href={href} className={adminStyles.iconBtn} aria-label="Edit proposal">
            <i className="ti ti-pencil" aria-hidden="true"></i>
          </Link>
        ) : (
          <>
            <button
              type="button"
              className={adminStyles.iconBtn}
              onClick={() => onToggleVisible(proposal)}
              disabled={busy}
              title={proposal.visible_to_client ? 'Shared with client — click to unshare' : 'Share with client'}
              style={{ color: proposal.visible_to_client ? 'var(--text-success)' : undefined }}
            >
              <i className={`ti ${proposal.visible_to_client ? 'ti-eye' : 'ti-eye-off'}`} aria-hidden="true"></i>
            </button>
            <Link href={href} className={adminStyles.iconBtn} aria-label="View proposal">
              <i className="ti ti-file-description" aria-hidden="true"></i>
            </Link>
            {proposal.pdf_path && (
              <a href={`/api/admin/proposals/${proposal.id}/download`} className={adminStyles.iconBtn} aria-label="Download PDF">
                <i className="ti ti-download" aria-hidden="true"></i>
              </a>
            )}
            <button type="button" className={adminStyles.iconBtn} aria-label="Duplicate as new draft" onClick={() => onDuplicate(proposal.id)} disabled={busy}>
              <i className="ti ti-copy" aria-hidden="true"></i>
            </button>
          </>
        )}
        <button type="button" className={adminStyles.iconBtn} aria-label="Delete proposal" onClick={() => onDelete(proposal.id)} disabled={busy}>
          <i className="ti ti-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
}

export default function ProjectProposalsList({ projectId, proposals }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  const drafts = proposals.filter((b) => b.status === 'draft');
  const finalized = proposals.filter((b) => b.status !== 'draft');

  async function handleDelete(id) {
    if (!confirm('Delete this proposal? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/proposals/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(id) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/proposals/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.proposal) {
        router.push(`/admin/projects/${projectId}/proposals/${data.proposal.id}`);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleVisible(proposal) {
    setBusyId(proposal.id);
    try {
      await fetch(`/api/admin/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_to_client: !proposal.visible_to_client }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', margin: '0 0 0.6rem' }}>
        Draft Proposals
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {drafts.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No draft proposals.</p>}
        {drafts.map((proposal) => (
          <ProposalRow key={proposal.id} proposal={proposal} projectId={projectId} busy={busyId === proposal.id} onDelete={handleDelete} onDuplicate={handleDuplicate} onToggleVisible={handleToggleVisible} />
        ))}
      </div>

      <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', margin: '0 0 0.6rem' }}>
        Finalized &amp; Sent Proposals
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {finalized.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No finalized proposals yet.</p>}
        {finalized.map((proposal) => (
          <ProposalRow key={proposal.id} proposal={proposal} projectId={projectId} busy={busyId === proposal.id} onDelete={handleDelete} onDuplicate={handleDuplicate} onToggleVisible={handleToggleVisible} />
        ))}
      </div>

      <div className={adminStyles.saveBar}>
        <Link href={`/admin/projects/${projectId}/proposals/new`} className="btn-navy">
          <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i> Create A Proposal
        </Link>
      </div>
    </div>
  );
}
