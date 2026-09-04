'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

const emptyForm = { title: '', description: '' };

export default function TrainingStepsEditor({ category, initialSteps }) {
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [newStep, setNewStep] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!newStep.title.trim()) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_type: category,
          title: newStep.title,
          description: newStep.description,
          sort_order: (initialSteps?.length || 0) + 1,
        }),
      });

      if (!res.ok) throw new Error();

      setAdding(false);
      setNewStep(emptyForm);
      router.refresh();
    } catch {
      setError('Could not add this step.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(step) {
    setEditingId(step.id);
    setEditForm({ title: step.title || '', description: step.description || '' });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function saveEdit(id) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/training/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) throw new Error();

      setEditingId(null);
      router.refresh();
    } catch {
      setError('Could not save changes.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this training step?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/training/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError('Could not delete this step.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {(initialSteps || []).map((step, i) =>
          editingId === step.id ? (
            <div className={adminStyles.utilityEntryForm} key={step.id}>
              <div className={adminStyles.fieldGroup}>
                <label className={adminStyles.fieldLabel}>Title</label>
                <input
                  className={adminStyles.fieldInput}
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className={adminStyles.fieldGroup}>
                <label className={adminStyles.fieldLabel}>Description</label>
                <textarea
                  className={adminStyles.fieldTextarea}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className={adminStyles.entryFormActions}>
                <button type="button" className="btn-navy" onClick={() => saveEdit(step.id)} disabled={busyId === step.id}>
                  {busyId === step.id ? 'Saving...' : 'Save step'}
                </button>
                <button type="button" className={adminStyles.cancelBtn} onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                border: '1px solid rgba(62,84,104,0.12)',
                opacity: busyId === step.id ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--gold-light)',
                  flexShrink: 0,
                  width: '1.5rem',
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--navy)', fontWeight: 500 }}>{step.title}</div>
                {step.description && (
                  <div style={{ fontSize: '0.82rem', color: '#718096', marginTop: '0.25rem', lineHeight: 1.6 }}>
                    {step.description}
                  </div>
                )}
              </div>
              <button type="button" className={adminStyles.iconBtn} onClick={() => startEdit(step)} aria-label="Edit step">
                <i className="ti ti-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className={adminStyles.iconBtn}
                onClick={() => handleDelete(step.id)}
                disabled={busyId === step.id}
                aria-label="Delete step"
              >
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          )
        )}
        {(!initialSteps || initialSteps.length === 0) && !adding && (
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>No steps in this category yet.</p>
        )}
      </div>

      {adding ? (
        <div className={adminStyles.utilityEntryForm}>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Title</label>
            <input
              className={adminStyles.fieldInput}
              value={newStep.title}
              onChange={(e) => setNewStep((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Confirm entitlements before design finalizes"
            />
          </div>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Description</label>
            <textarea
              className={adminStyles.fieldTextarea}
              value={newStep.description}
              onChange={(e) => setNewStep((p) => ({ ...p, description: e.target.value }))}
              placeholder="What the employee actually needs to do, and why"
            />
          </div>
          <div className={adminStyles.entryFormActions}>
            <button type="button" className="btn-navy" onClick={handleAdd} disabled={saving || !newStep.title.trim()}>
              {saving ? 'Adding...' : 'Add step'}
            </button>
            <button type="button" className={adminStyles.cancelBtn} onClick={() => { setAdding(false); setNewStep(emptyForm); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={adminStyles.addRowBtn} onClick={() => setAdding(true)}>
          <i className="ti ti-plus" aria-hidden="true"></i> Add step
        </button>
      )}

      {error && (
        <p className={adminStyles.formMsgError} style={{ marginTop: '0.75rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
