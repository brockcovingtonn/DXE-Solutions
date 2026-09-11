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

function BidRow({ bid, projectId, busy, onDelete, onDuplicate }) {
  const s = STATUS_STYLE[bid.status] || STATUS_STYLE.draft;
  const href = bid.status === 'draft' ? `/admin/projects/${projectId}/bids/${bid.id}` : `/admin/projects/${projectId}/bids/${bid.id}/view`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid rgba(var(--border-rgb),0.12)', opacity: busy ? 0.6 : 1, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', background: s.bg, color: s.color, flexShrink: 0 }}>
        {s.label}
      </span>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <Link href={href} style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--navy)' }}>
          {bid.title}
        </Link>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
          {bid.status === 'draft' ? `Last edited ${formatDate(bid.updated_at)}` : bid.status === 'sent' ? `Sent ${formatDate(bid.sent_at)} to ${bid.sent_to_email || ''}` : `Finalized ${formatDate(bid.finalized_at)}`}
        </div>
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>{formatCurrency(bid.total)}</div>
      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
        {bid.status === 'draft' ? (
          <Link href={href} className={adminStyles.iconBtn} aria-label="Edit bid">
            <i className="ti ti-pencil" aria-hidden="true"></i>
          </Link>
        ) : (
          <>
            <Link href={href} className={adminStyles.iconBtn} aria-label="View bid">
              <i className="ti ti-eye" aria-hidden="true"></i>
            </Link>
            {bid.pdf_path && (
              <a href={`/api/admin/bids/${bid.id}/download`} className={adminStyles.iconBtn} aria-label="Download PDF">
                <i className="ti ti-download" aria-hidden="true"></i>
              </a>
            )}
            <button type="button" className={adminStyles.iconBtn} aria-label="Duplicate as new draft" onClick={() => onDuplicate(bid.id)} disabled={busy}>
              <i className="ti ti-copy" aria-hidden="true"></i>
            </button>
          </>
        )}
        <button type="button" className={adminStyles.iconBtn} aria-label="Delete bid" onClick={() => onDelete(bid.id)} disabled={busy}>
          <i className="ti ti-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
}

export default function ProjectBidsList({ projectId, bids }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  const drafts = bids.filter((b) => b.status === 'draft');
  const finalized = bids.filter((b) => b.status !== 'draft');

  async function handleDelete(id) {
    if (!confirm('Delete this bid? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/bids/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(id) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/bids/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.bid) {
        router.push(`/admin/projects/${projectId}/bids/${data.bid.id}`);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', margin: '0 0 0.6rem' }}>
        Draft Bids
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {drafts.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No draft bids.</p>}
        {drafts.map((bid) => (
          <BidRow key={bid.id} bid={bid} projectId={projectId} busy={busyId === bid.id} onDelete={handleDelete} onDuplicate={handleDuplicate} />
        ))}
      </div>

      <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', margin: '0 0 0.6rem' }}>
        Finalized &amp; Sent Bids
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {finalized.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No finalized bids yet.</p>}
        {finalized.map((bid) => (
          <BidRow key={bid.id} bid={bid} projectId={projectId} busy={busyId === bid.id} onDelete={handleDelete} onDuplicate={handleDuplicate} />
        ))}
      </div>

      <div className={adminStyles.saveBar}>
        <Link href={`/admin/projects/${projectId}/bids/new`} className="btn-navy">
          <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i> Create A Bid
        </Link>
      </div>
    </div>
  );
}
