'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { PROPERTY_AREAS } from '@/lib/constants';

function formatTimeline(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ScopeOfWorkEditor({ projectId, areas, isAdmin, readOnly = false }) {
  const router = useRouter();
  // Checkboxes stay clickable either way — checking items off is the main
  // use of this feature. "Editing" only reveals the add/delete/notes/
  // timeline chrome, kept separate from the page-level view/edit-popup
  // pattern since hiding the checklist itself inside a modal would defeat
  // the point of a quick field checklist.
  const [editing, setEditing] = useState(false);
  const showAdminControls = isAdmin && editing;
  // Only one area's checklist is shown at a time — opening another area
  // collapses whichever was open, so the list doesn't turn into one long
  // continuous scroll across every area.
  const [expandedAreaId, setExpandedAreaId] = useState(null);
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

  async function saveItemField(itemId, field, value) {
    await fetch(`/api/admin/scope-items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    router.refresh();
  }

  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.6rem' }}>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(var(--border-rgb),0.18)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--navy)',
              padding: '0.3rem 0.75rem',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      )}

      {(areas || []).length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          No scope of work areas added yet.
        </p>
      )}

      {(areas || []).map((area) => {
        const items = area.scope_items || [];
        const completedCount = items.filter((i) => i.completed).length;
        const isExpanded = expandedAreaId === area.id;
        return (
          <div key={area.id} className={adminStyles.utilitySection} style={{ padding: isExpanded ? '1rem' : '0.6rem 1rem' }}>
            <button
              type="button"
              onClick={() => setExpandedAreaId((prev) => (prev === area.id ? null : area.id))}
              className={adminStyles.utilitySectionHeader}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                borderBottom: isExpanded ? undefined : 'none',
                paddingLeft: 0,
                paddingRight: 0,
                paddingBottom: isExpanded ? undefined : 0,
                marginBottom: isExpanded ? undefined : 0,
                font: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className={`ti ${isExpanded ? 'ti-chevron-down' : 'ti-chevron-right'}`} aria-hidden="true" style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}></i>
                <span className={adminStyles.utilityToggleLabel}>{area.name}</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={adminStyles.utilityToggleHint}>
                  {items.length === 0 ? 'No items yet' : `${completedCount}/${items.length} complete`}
                </span>
                {showAdminControls && (
                  <span
                    role="button"
                    tabIndex={0}
                    className={adminStyles.iconBtn}
                    aria-label={`Delete ${area.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteArea(area.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        deleteArea(area.id);
                      }
                    }}
                    aria-disabled={busyId === area.id}
                  >
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </span>
                )}
              </div>
            </button>

            {isExpanded && items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  padding: '0.4rem 0',
                  flexWrap: 'wrap',
                  opacity: busyId === item.id ? 0.6 : 1,
                  borderBottom: '1px solid rgba(var(--border-rgb),0.06)',
                }}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={readOnly ? undefined : () => toggleItem(item)}
                  disabled={readOnly || busyId === item.id}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginTop: '0.4rem',
                    accentColor: 'var(--gold)',
                    cursor: readOnly ? 'default' : 'pointer',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: '1 1 220px',
                    fontSize: '0.85rem',
                    marginTop: '0.3rem',
                    color: item.completed ? 'var(--text-tertiary)' : 'var(--navy)',
                    textDecoration: item.completed ? 'line-through' : 'none',
                  }}
                >
                  {item.description}
                </span>
                {showAdminControls ? (
                  <>
                    <input
                      className={adminStyles.fieldInput}
                      style={{ width: '160px', flexShrink: 0 }}
                      placeholder="Notes"
                      defaultValue={item.notes || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (item.notes || '')) saveItemField(item.id, 'notes', e.target.value);
                      }}
                    />
                    <input
                      className={adminStyles.fieldInput}
                      style={{ width: '130px', flexShrink: 0 }}
                      type="date"
                      title="Timeline"
                      defaultValue={item.timeline || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (item.timeline || '')) saveItemField(item.id, 'timeline', e.target.value || null);
                      }}
                    />
                    <button
                      type="button"
                      className={adminStyles.iconBtn}
                      aria-label="Delete item"
                      onClick={() => deleteItem(item.id)}
                      disabled={busyId === item.id}
                    >
                      <i className="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                    {item.notes && <span>Notes: {item.notes}</span>}
                    {item.timeline && <span>Timeline: {formatTimeline(item.timeline)}</span>}
                  </div>
                )}
              </div>
            ))}

            {isExpanded && showAdminControls && (
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

      {showAdminControls && (
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
