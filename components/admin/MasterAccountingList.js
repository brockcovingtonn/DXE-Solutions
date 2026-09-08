'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import adminStyles from '@/components/admin.module.css';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function MasterAccountingList({ initialInvoices }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function togglePaid(item) {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/invoices/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: item.status === 'paid' ? 'unpaid' : 'paid' }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!initialInvoices || initialInvoices.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No entries match this filter.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {initialInvoices.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            border: '1px solid rgba(var(--border-rgb),0.12)',
            opacity: busyId === item.id ? 0.6 : 1,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '0.2rem 0.5rem',
              background: item.kind === 'receipt' ? 'rgba(59,130,246,0.12)' : 'rgba(201,168,87,0.18)',
              color: item.kind === 'receipt' ? '#1e40af' : '#7a5c0a',
              flexShrink: 0,
            }}
          >
            {item.kind}
          </span>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--navy)', fontWeight: 500 }}>{item.description}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
              <Link href={`/admin/projects/${item.project_id}`} style={{ color: 'var(--gold)' }}>
                {item.projects?.name || 'Unknown project'}
              </Link>
              {item.projects?.profiles && ` · ${item.projects.profiles.first_name} ${item.projects.profiles.last_name}`}
              {' · '}
              {item.due_date ? `Due ${item.due_date}` : item.paid_date ? `Paid ${item.paid_date}` : '—'}
            </div>
          </div>

          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
            {formatCurrency(item.amount)}
          </div>

          {item.kind === 'invoice' && (
            <button
              type="button"
              onClick={() => togglePaid(item)}
              disabled={busyId === item.id}
              className={adminStyles.iconBtn}
              title={item.status === 'paid' ? 'Paid — click to mark unpaid' : 'Unpaid — click to mark paid'}
              style={{ color: item.status === 'paid' ? 'var(--text-success)' : 'var(--text-error)' }}
            >
              <i className={`ti ${item.status === 'paid' ? 'ti-circle-check' : 'ti-circle-dashed'}`} aria-hidden="true"></i>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
