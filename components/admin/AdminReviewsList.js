'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import adminStyles from '@/components/admin.module.css';
import StarRating from '@/components/StarRating';
import EmptyState from '@/components/EmptyState';

export default function AdminReviewsList({ initialReviews }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function toggleFeatured(review) {
    setBusyId(review.id);
    try {
      await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !review.featured }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!initialReviews || initialReviews.length === 0) {
    return <EmptyState icon="ti-star" title="No reviews yet" subtitle="Client reviews will show up here once submitted." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {initialReviews.map((r) => (
        <div
          key={r.id}
          style={{
            padding: '1rem',
            border: '1px solid rgba(var(--border-rgb),0.12)',
            background: r.featured ? 'var(--surface)' : 'var(--white)',
            opacity: busyId === r.id ? 0.6 : 1,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <StarRating value={r.rating} readOnly size={16} />
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--navy)', marginTop: '0.3rem' }}>
                {r.client_name}
                {r.projects?.name && (
                  <>
                    {' — '}
                    <Link href={`/admin/projects/${r.projects.id}`} style={{ color: 'var(--gold)' }}>
                      {r.projects.name}
                    </Link>
                  </>
                )}
              </div>
              {r.project_type && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' }}>{r.project_type}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => toggleFeatured(r)}
                disabled={busyId === r.id}
                className={adminStyles.iconBtn}
                title={r.featured ? 'Featured on the website — click to unfeature' : 'Not featured — click to show on the website'}
                style={{ color: r.featured ? 'var(--gold)' : 'var(--text-faint)' }}
              >
                <i className={`ti ${r.featured ? 'ti-star-filled' : 'ti-star'}`} aria-hidden="true"></i>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                disabled={busyId === r.id}
                className={adminStyles.iconBtn}
                aria-label="Delete review"
              >
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          {r.body && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.body}</p>}
        </div>
      ))}
    </div>
  );
}
