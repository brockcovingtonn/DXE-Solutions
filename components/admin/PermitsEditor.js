'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { PERMIT_TYPES, PERMIT_STATUSES, PERMIT_AGENCIES } from '@/lib/constants';

const emptyForm = {
  permit_type: '',
  permit_number: '',
  agency: '',
  status: 'not_started',
  submitted_date: '',
  issued_date: '',
  expiration_date: '',
  notes: '',
};

const AGENCY_LIST_ID = 'permit-agency-options';

function statusLabel(value) {
  return PERMIT_STATUSES.find((s) => s.value === value)?.label || value;
}

// Defined at module scope — NOT inside PermitsEditor. When this lived
// inside the component it was a brand-new function on every render, so
// React remounted the whole subtree on each keystroke and the focused
// input lost focus after one character.
function PermitFields({ value, onChange }) {
  return (
    <>
      <div className={adminStyles.formGrid3}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Permit Type</label>
          <select
            className={adminStyles.fieldInput}
            value={value.permit_type}
            onChange={(e) => onChange({ ...value, permit_type: e.target.value })}
          >
            <option value="">Select...</option>
            {PERMIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Permit Number</label>
          <input
            className={adminStyles.fieldInput}
            value={value.permit_number}
            onChange={(e) => onChange({ ...value, permit_number: e.target.value })}
            placeholder="e.g. B24-01234"
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Agency</label>
          <input
            className={adminStyles.fieldInput}
            list={AGENCY_LIST_ID}
            value={value.agency}
            onChange={(e) => onChange({ ...value, agency: e.target.value })}
            placeholder="Start typing or pick from the list…"
          />
        </div>
      </div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Status</label>
          <select
            className={adminStyles.fieldInput}
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value })}
          >
            {PERMIT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={adminStyles.formGrid3}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Submitted</label>
          <input
            type="date"
            className={adminStyles.fieldInput}
            value={value.submitted_date}
            onChange={(e) => onChange({ ...value, submitted_date: e.target.value })}
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Issued</label>
          <input
            type="date"
            className={adminStyles.fieldInput}
            value={value.issued_date}
            onChange={(e) => onChange({ ...value, issued_date: e.target.value })}
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Expires</label>
          <input
            type="date"
            className={adminStyles.fieldInput}
            value={value.expiration_date}
            onChange={(e) => onChange({ ...value, expiration_date: e.target.value })}
          />
        </div>
      </div>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Notes (internal only — never shown to client)</label>
        <textarea
          className={adminStyles.fieldTextarea}
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </div>
    </>
  );
}

export default function PermitsEditor({ projectId, initialPermits }) {
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [newPermit, setNewPermit] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!newPermit.permit_type) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...newPermit }),
      });

      if (!res.ok) throw new Error();

      setAdding(false);
      setNewPermit(emptyForm);
      router.refresh();
    } catch {
      setError('Could not add this permit.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(permit) {
    setEditingId(permit.id);
    setEditForm({
      permit_type: permit.permit_type || '',
      permit_number: permit.permit_number || '',
      agency: permit.agency || '',
      status: permit.status || 'not_started',
      submitted_date: permit.submitted_date || '',
      issued_date: permit.issued_date || '',
      expiration_date: permit.expiration_date || '',
      notes: permit.notes || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function saveEdit(id) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/permits/${id}`, {
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
    if (!confirm('Delete this permit? This cannot be undone.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/permits/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError('Could not delete this permit.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <datalist id={AGENCY_LIST_ID}>
        {PERMIT_AGENCIES.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      {(initialPermits || []).map((permit) =>
        editingId === permit.id ? (
          <div className={adminStyles.utilityEntryForm} key={permit.id}>
            <PermitFields value={editForm} onChange={setEditForm} />
            <div className={adminStyles.entryFormActions}>
              <button type="button" className="btn-navy" onClick={() => saveEdit(permit.id)} disabled={busyId === permit.id}>
                {busyId === permit.id ? 'Saving...' : 'Save permit'}
              </button>
              <button type="button" className={adminStyles.cancelBtn} onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={adminStyles.utilityEntryBlock} key={permit.id}>
            <div className={adminStyles.utilityEntryGrid}>
              <div className={adminStyles.utilityEntryField}>
                <div className={adminStyles.ufLabel}>Type</div>
                <div className={adminStyles.ufValue}>{permit.permit_type}</div>
              </div>
              <div className={adminStyles.utilityEntryField}>
                <div className={adminStyles.ufLabel}>Permit #</div>
                <div className={adminStyles.ufValue}>{permit.permit_number || '—'}</div>
              </div>
              <div className={adminStyles.utilityEntryField}>
                <div className={adminStyles.ufLabel}>Agency</div>
                <div className={adminStyles.ufValue}>{permit.agency || '—'}</div>
              </div>
              <div className={adminStyles.utilityEntryField}>
                <div className={adminStyles.ufLabel}>Status</div>
                <div className={adminStyles.ufValue}>{statusLabel(permit.status)}</div>
              </div>
              <div className={adminStyles.utilityEntryField}>
                <div className={adminStyles.ufLabel}>Issued</div>
                <div className={adminStyles.ufValue}>{permit.issued_date || '—'}</div>
              </div>
              <div className={adminStyles.utilityEntryField}>
                <div className={adminStyles.ufLabel}>Expires</div>
                <div className={adminStyles.ufValue}>{permit.expiration_date || '—'}</div>
              </div>
            </div>
            <div className={adminStyles.utilityEntryActions}>
              <button type="button" className={adminStyles.iconBtn} onClick={() => startEdit(permit)} aria-label="Edit permit">
                <i className="ti ti-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className={adminStyles.iconBtn}
                onClick={() => handleDelete(permit.id)}
                disabled={busyId === permit.id}
                aria-label="Delete permit"
              >
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        )
      )}

      {(!initialPermits || initialPermits.length === 0) && !adding && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>No permits on file yet.</p>
      )}

      {adding ? (
        <div className={adminStyles.utilityEntryForm}>
          <PermitFields value={newPermit} onChange={setNewPermit} />
          <div className={adminStyles.entryFormActions}>
            <button type="button" className="btn-navy" onClick={handleAdd} disabled={saving || !newPermit.permit_type}>
              {saving ? 'Adding...' : 'Add permit'}
            </button>
            <button type="button" className={adminStyles.cancelBtn} onClick={() => { setAdding(false); setNewPermit(emptyForm); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={adminStyles.addRowBtn} onClick={() => setAdding(true)}>
          <i className="ti ti-plus" aria-hidden="true"></i> Add permit
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
