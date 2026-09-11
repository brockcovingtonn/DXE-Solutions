'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

function formatDate(d) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function monthKey(d) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function UpcomingPaymentsList({ initialItems }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function handleConfirm(id) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/payment-schedule/${id}/confirm`, { method: 'POST' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!initialItems || initialItems.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No upcoming scheduled payments.</p>;
  }

  const groups = new Map();
  for (const item of initialItems) {
    const key = monthKey(item.due_date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  return (
    <div>
      {Array.from(groups.entries()).map(([month, items]) => {
        const monthTotal = items.reduce((sum, i) => sum + Number(i.amount), 0);
        return (
          <div key={month} style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', margin: 0 }}>
                {month}
              </h4>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy)' }}>{formatCurrency(monthTotal)} expected</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.map((item) => {
                const overdue = !item.confirmed_at && new Date(`${item.due_date}T00:00:00`) < new Date(new Date().toDateString());
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid rgba(var(--border-rgb),0.12)', opacity: busyId === item.id ? 0.6 : 1, flexWrap: 'wrap' }}>
                    {item.projects?.color && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.projects.color, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <Link href={`/admin/projects/${item.project_id}#accounting`} style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--navy)' }}>
                        {item.projects?.name || 'Project'}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{item.description}</div>
                      <div style={{ fontSize: '0.75rem', color: overdue ? 'var(--text-error)' : 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                        Due {formatDate(item.due_date)}
                        {item.confirmed_at ? ' · Confirmed' : ' · Not yet confirmed'}
                        {overdue ? ' · Past due' : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>{formatCurrency(item.amount)}</div>
                    <button
                      type="button"
                      className={adminStyles.iconBtn}
                      onClick={() => handleConfirm(item.id)}
                      disabled={busyId === item.id}
                      title={item.confirmed_at ? 'Confirmed — click to reconfirm' : 'Confirm still on schedule'}
                      style={{ color: item.confirmed_at ? 'var(--text-success)' : undefined }}
                    >
                      <i className={`ti ${item.confirmed_at ? 'ti-circle-check' : 'ti-circle'}`} aria-hidden="true"></i>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
