'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/components/portal-shared.module.css';

export default function EmployeeActionItems({ initialItems }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function toggle(item) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/action-items/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: item.status === 'done' ? 'open' : 'done' }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!initialItems || initialItems.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: '#718096' }}>You have no action items assigned right now.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {initialItems.map((item) => (
        <label
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.65rem 0.75rem',
            border: '1px solid rgba(62,84,104,0.12)',
            background: item.status === 'done' ? 'var(--surface)' : 'var(--white)',
            cursor: 'pointer',
            opacity: busyId === item.id ? 0.6 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={item.status === 'done'}
            onChange={() => toggle(item)}
            disabled={busyId === item.id}
            style={{ width: '16px', height: '16px', marginTop: '0.15rem', accentColor: 'var(--gold)', cursor: 'pointer' }}
          />
          <div>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 500,
                color: 'var(--navy)',
                textDecoration: item.status === 'done' ? 'line-through' : 'none',
                opacity: item.status === 'done' ? 0.6 : 1,
              }}
            >
              {item.title}
            </div>
            {item.description && (
              <div style={{ fontSize: '0.78rem', color: '#718096', marginTop: '0.15rem' }}>{item.description}</div>
            )}
            {item.projects?.name && (
              <div style={{ fontSize: '0.72rem', color: '#a0aec0', marginTop: '0.2rem' }}>
                {item.projects.name}
                {item.due_date ? ` · Due ${item.due_date}` : ''}
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
