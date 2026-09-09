'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import adminStyles from '@/components/admin.module.css';

export default function ContactsList({ contacts }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} contact${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`)) return;

    setIsDeleting(true);
    setError('');
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) => fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' }))
      );
      if (results.some((res) => !res.ok)) {
        setError('Some contacts could not be deleted.');
      }
      clearSelection();
      router.refresh();
    } catch {
      setError('Could not delete the selected contacts.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      {selectedIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.6rem 0.85rem',
            background: 'var(--surface)',
            border: '1px solid rgba(var(--border-rgb),0.15)',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.82rem', color: 'var(--navy)', fontWeight: 500 }}>
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            style={{ background: 'none', border: '1px solid var(--text-error)', color: 'var(--text-error)', padding: '0.4rem 0.9rem', fontSize: '0.78rem', cursor: 'pointer' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Selected'}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}
          >
            Clear selection
          </button>
        </div>
      )}
      {error && <p style={{ fontSize: '0.8rem', color: 'var(--text-error)', marginBottom: '0.75rem' }}>{error}</p>}

      <div className={adminStyles.clientList}>
        {contacts.map((contact) => (
          <div key={contact.id} className={adminStyles.contactRow} style={{ textDecoration: 'none' }}>
            <input
              type="checkbox"
              checked={selectedIds.has(contact.id)}
              onChange={() => toggle(contact.id)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--gold)', flexShrink: 0 }}
              aria-label={`Select ${contact.name}`}
            />
            <Link href={`/admin/contacts/${contact.id}`} style={{ display: 'flex', flex: 1, gap: '1.5rem', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
              <div className={adminStyles.clientInfo}>
                <div className={adminStyles.clientName}>{contact.name}</div>
                <div className={adminStyles.clientEmail}>
                  {[contact.trade, contact.company].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <div className={adminStyles.clientProjects}>
                {(contact.project_contacts || []).map((pc) => (
                  <span className={adminStyles.projectChip} key={pc.project_id}>
                    {pc.projects?.name}
                  </span>
                ))}
                {(!contact.project_contacts || contact.project_contacts.length === 0) && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Not linked to a project</span>
                )}
              </div>
              <div className={adminStyles.contactMeta}>
                {contact.phone && <div>{contact.phone}</div>}
                {contact.email && <div>{contact.email}</div>}
                {contact.website && <div>{contact.website}</div>}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
