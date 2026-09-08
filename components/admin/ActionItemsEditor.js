'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

const initialForm = { title: '', description: '', assigned_to: '', due_date: '', visible_to_client: false };

export default function ActionItemsEditor({ projectId, initialItems, assignablePeople }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const peopleById = Object.fromEntries((assignablePeople || []).map((p) => [p.id, p]));

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;

    setPosting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...form }),
      });

      if (!res.ok) throw new Error();

      setForm(initialForm);
      router.refresh();
    } catch {
      setError('Could not add this action item.');
    } finally {
      setPosting(false);
    }
  }

  async function patchItem(id, patch) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/action-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError('Could not save that change.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this action item?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/action-items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError('Could not delete this action item.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {(initialItems || []).map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.75rem',
              border: '1px solid rgba(var(--border-rgb),0.12)',
              background: item.status === 'done' ? 'var(--surface)' : 'var(--white)',
              opacity: busyId === item.id ? 0.6 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={item.status === 'done'}
              onChange={() => patchItem(item.id, { status: item.status === 'done' ? 'open' : 'done' })}
              disabled={busyId === item.id}
              style={{ width: '16px', height: '16px', marginTop: '0.2rem', accentColor: 'var(--gold)', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--navy)',
                  fontWeight: 500,
                  textDecoration: item.status === 'done' ? 'line-through' : 'none',
                  opacity: item.status === 'done' ? 0.6 : 1,
                }}
              >
                {item.title}
              </div>
              {item.description && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{item.description}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                {item.assigned_to && peopleById[item.assigned_to] && (
                  <span>
                    <i className="ti ti-user" aria-hidden="true"></i>{' '}
                    {peopleById[item.assigned_to].first_name} {peopleById[item.assigned_to].last_name}
                  </span>
                )}
                {item.due_date && (
                  <span>
                    <i className="ti ti-calendar" aria-hidden="true"></i> {item.due_date}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => patchItem(item.id, { visible_to_client: !item.visible_to_client })}
              disabled={busyId === item.id}
              title={item.visible_to_client ? 'Visible to client — click to hide' : 'Hidden from client — click to show'}
              className={adminStyles.iconBtn}
              style={{ color: item.visible_to_client ? 'var(--gold)' : 'var(--text-faint)' }}
            >
              <i className={`ti ${item.visible_to_client ? 'ti-eye' : 'ti-eye-off'}`} aria-hidden="true"></i>
            </button>
            <button
              type="button"
              className={adminStyles.iconBtn}
              onClick={() => handleDelete(item.id)}
              disabled={busyId === item.id}
              aria-label="Delete action item"
            >
              <i className="ti ti-trash" aria-hidden="true"></i>
            </button>
          </div>
        ))}
        {(!initialItems || initialItems.length === 0) && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No action items yet.</p>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className={adminStyles.formGrid2}>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Title</label>
            <input
              className={adminStyles.fieldInput}
              name="title"
              value={form.title}
              onChange={handleFormChange}
              placeholder="e.g. Submit resubmittal package"
            />
          </div>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Assign to</label>
            <select className={adminStyles.fieldInput} name="assigned_to" value={form.assigned_to} onChange={handleFormChange}>
              <option value="">Unassigned</option>
              {(assignablePeople || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Description (optional)</label>
          <textarea
            className={adminStyles.fieldTextarea}
            name="description"
            value={form.description}
            onChange={handleFormChange}
            placeholder="Any detail worth noting"
          />
        </div>

        <div className={adminStyles.formGrid2}>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Due date (optional)</label>
            <input
              className={adminStyles.fieldInput}
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={handleFormChange}
            />
          </div>
          <div className={adminStyles.fieldGroup} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.4rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--navy)' }}>
              <input
                type="checkbox"
                name="visible_to_client"
                checked={form.visible_to_client}
                onChange={handleFormChange}
                style={{ width: '16px', height: '16px', accentColor: 'var(--gold)', cursor: 'pointer' }}
              />
              Visible to client
            </label>
          </div>
        </div>

        {error && <p className={adminStyles.formMsgError}>{error}</p>}

        <div className={adminStyles.saveBar}>
          <button type="submit" className="btn-navy" disabled={posting || !form.title.trim()}>
            {posting ? 'Adding...' : 'Add action item'}
          </button>
        </div>
      </form>
    </div>
  );
}
