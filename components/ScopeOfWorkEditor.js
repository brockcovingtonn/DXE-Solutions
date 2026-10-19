'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { PROPERTY_AREAS } from '@/lib/constants';

export default function ScopeOfWorkEditor({ projectId, areas, isAdmin }) {
  const router = useRouter();
  const [areaSelect, setAreaSelect] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [addingArea, setAddingArea] = useState(false);
  const [itemDrafts, setItemDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  async function addArea(e) {
    e.preventDefault();
    const name = areaSelect === 'Other' ? customArea.trim() : areaSelect;
    if (!name) return;

    setAddingArea(true);
    setError('');
    try {
      const res = await fetch('/api/admin/scope-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name }),
      });
      if (!res.ok) throw new Error();
      setAreaSelect('');
      setCustomArea('');
      router.refresh();
    } catch {
      setError('Could not add that area.');
    } finally {
      setAddingArea(false);
    }
  }

  async function deleteArea(areaId) {
    if (!confirm('Delete this area and all of its checklist items? This cannot be undone.')) return;
    setBusyId(areaId);
    try {
      await fetch(`/api/admin/scope-areas/${areaId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function addItem(areaId) {
    const description = (itemDrafts[areaId] || '').trim();
    if (!description) return;

    setBusyId(`new-${areaId}`);
    try {
      const res = await fetch('/api/admin/scope-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId, projectId, description }),
      });
      if (!res.ok) throw new Error();
      setItemDrafts((prev) => ({ ...prev, [areaId]: '' }));
      router.refresh();
    } catch {
      setError('Could not add that item.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleItem(item) {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/scope-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !item.completed }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteItem(itemId) {
    setBusyId(itemId);
    try {
      await fetch(`/api/admin/scope-items/${itemId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {(areas || []).length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          No scope of work areas added yet.
        </p>
      )}

      {(areas || []).map((area) => {
        const items = area.scope_items || [];
        const completedCount = items.filter((i) => i.completed).length;
        return (
          <div key={area.id} className={adminStyles.utilitySection}>
            <div className={adminStyles.utilitySectionHeader}>
              <span className={adminStyles.utilityToggleLabel}>{area.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={adminStyles.utilityToggleHint}>
                  {items.length === 0 ? 'No items yet' : `${completedCount}/${items.length} complete`}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    className={adminStyles.iconBtn}
                    aria-label={`Delete ${area.name}`}
                    onClick={() => deleteArea(area.id)}
                    disabled={busyId === area.id}
                  >
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </button>
                )}
              </div>
            </div>

            {items.map((item) => (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  padding: '0.4rem 0',
                  opacity: busyId === item.id ? 0.6 : 1,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleItem(item)}
                  disabled={busyId === item.id}
                  style={{ width: '16px', height: '16px', marginTop: '0.15rem', accentColor: 'var(--gold)', cursor: 'pointer' }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: '0.85rem',
                    color: item.completed ? 'var(--text-tertiary)' : 'var(--navy)',
                    textDecoration: item.completed ? 'line-through' : 'none',
                  }}
                >
                  {item.description}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    className={adminStyles.iconBtn}
                    aria-label="Delete item"
                    onClick={() => deleteItem(item.id)}
                    disabled={busyId === item.id}
                  >
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </button>
                )}
              </label>
            ))}

            {isAdmin && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <input
                  className={adminStyles.fieldInput}
                  placeholder="Add a checklist item..."
                  value={itemDrafts[area.id] || ''}
                  onChange={(e) => setItemDrafts((prev) => ({ ...prev, [area.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem(area.id);
                    }
                  }}
                />
                <button
                  type="button"
                  className={adminStyles.cancelBtn}
                  onClick={() => addItem(area.id)}
                  disabled={busyId === `new-${area.id}` || !(itemDrafts[area.id] || '').trim()}
                >
                  Add
                </button>
              </div>
            )}
          </div>
        );
      })}

      {isAdmin && (
        <form onSubmit={addArea} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className={adminStyles.fieldInput}
            style={{ width: 'auto' }}
            value={areaSelect}
            onChange={(e) => setAreaSelect(e.target.value)}
          >
            <option value="" disabled>
              Choose an area...
            </option>
            {PROPERTY_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {areaSelect === 'Other' && (
            <input
              className={adminStyles.fieldInput}
              style={{ width: 'auto' }}
              placeholder="Custom area name"
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
            />
          )}
          <button type="submit" className="btn-navy" disabled={addingArea || !areaSelect || (areaSelect === 'Other' && !customArea.trim())}>
            {addingArea ? 'Adding...' : 'Add area'}
          </button>
        </form>
      )}

      {error && (
        <p className={adminStyles.formMsgError} style={{ marginTop: '0.75rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
