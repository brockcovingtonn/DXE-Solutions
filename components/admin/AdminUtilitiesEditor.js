'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { UTILITY_TYPES, UTILITY_STATUSES, TRADE_OPTIONS } from '@/lib/constants';

const emptyEntry = {
  application: '',
  work_request_number: '',
  status: 'not_ready',
  action_step: '',
  comments: '',
};

function buildUtilities(initialUtilities) {
  return UTILITY_TYPES.map((t) => {
    const existing = initialUtilities.find((u) => u.utility_type === t.value);
    return {
      id: existing?.id || null,
      utility_type: t.value,
      enabled: existing?.enabled || false,
      contact_trade: existing?.contact_trade || '',
      contact_name: existing?.contact_name || '',
      contact_phone: existing?.contact_phone || '',
      contact_email: existing?.contact_email || '',
      contact_comments: existing?.contact_comments || '',
      entries: existing?.entries || [],
    };
  });
}

export default function AdminUtilitiesEditor({ projectId, initialUtilities }) {
  const router = useRouter();

  const [utilities, setUtilities] = useState(() => buildUtilities(initialUtilities));

  // Re-sync local state whenever the server-provided data changes
  // (e.g. after router.refresh() following an entry add/edit/delete)
  useEffect(() => {
    setUtilities(buildUtilities(initialUtilities));
  }, [initialUtilities]);

  const [addingFor, setAddingFor] = useState(null);
  const [newEntry, setNewEntry] = useState(emptyEntry);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editEntry, setEditEntry] = useState(emptyEntry);
  const [entrySaving, setEntrySaving] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(typeValue, field, value) {
    setUtilities((prev) =>
      prev.map((u) => (u.utility_type === typeValue ? { ...u, [field]: value } : u))
    );
  }

  async function handleSaveContact() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/utilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, utilities }),
      });

      if (!res.ok) throw new Error();

      setMessage('Saved.');
      router.refresh();
    } catch {
      setMessage('Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  function startAddEntry(typeValue) {
    setAddingFor(typeValue);
    setNewEntry(emptyEntry);
  }

  function cancelAddEntry() {
    setAddingFor(null);
    setNewEntry(emptyEntry);
  }

  async function saveNewEntry(utility) {
    if (!utility.id) {
      setMessage('Save the contact info for this utility first (click "Save utilities" below), then add entries.');
      return;
    }

    setEntrySaving(true);
    try {
      const res = await fetch('/api/admin/utility-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utilityId: utility.id, ...newEntry }),
      });

      if (!res.ok) throw new Error();

      setAddingFor(null);
      setNewEntry(emptyEntry);
      router.refresh();
    } catch {
      setMessage('Could not save entry.');
    } finally {
      setEntrySaving(false);
    }
  }

  function startEditEntry(entry) {
    setEditingEntryId(entry.id);
    setEditEntry({
      application: entry.application || '',
      work_request_number: entry.work_request_number || '',
      status: entry.status || 'not_ready',
      action_step: entry.action_step || '',
      comments: entry.comments || '',
    });
  }

  function cancelEditEntry() {
    setEditingEntryId(null);
    setEditEntry(emptyEntry);
  }

  async function saveEditEntry(entryId) {
    setEntrySaving(true);
    try {
      const res = await fetch(`/api/admin/utility-entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEntry),
      });

      if (!res.ok) throw new Error();

      setEditingEntryId(null);
      router.refresh();
    } catch {
      setMessage('Could not save entry.');
    } finally {
      setEntrySaving(false);
    }
  }

  async function deleteEntry(entryId) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;

    setEntrySaving(true);
    try {
      await fetch(`/api/admin/utility-entries/${entryId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setEntrySaving(false);
    }
  }

  function statusLabel(value) {
    return UTILITY_STATUSES.find((s) => s.value === value)?.label || value;
  }

  return (
    <div>
      {UTILITY_TYPES.map((type) => {
        const u = utilities.find((x) => x.utility_type === type.value);
        const entries = u.entries || [];

        return (
          <div className={adminStyles.utilitySection} key={type.value}>
            <div className={adminStyles.utilitySectionHeader}>
              <label className={adminStyles.utilityToggle}>
                <input
                  type="checkbox"
                  checked={u.enabled}
                  onChange={(e) => update(type.value, 'enabled', e.target.checked)}
                />
                <span className={adminStyles.utilityToggleLabel}>{type.label}</span>
              </label>
              <span className={adminStyles.utilityToggleHint}>
                {u.enabled ? 'Visible to client' : 'Hidden from client'}
              </span>
            </div>

            <div className={adminStyles.utilityContactHeader} style={{ marginTop: 0 }}>
              Contact
            </div>
            <div className={adminStyles.formGrid2}>
              <div className={adminStyles.fieldGroup}>
                <label className={adminStyles.fieldLabel}>Trade / Title</label>
                <select
                  className={adminStyles.fieldInput}
                  value={u.contact_trade}
                  onChange={(e) => update(type.value, 'contact_trade', e.target.value)}
                >
                  <option value="">Select...</option>
                  {TRADE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className={adminStyles.fieldGroup}>
                <label className={adminStyles.fieldLabel}>Name</label>
                <input
                  className={adminStyles.fieldInput}
                  value={u.contact_name}
                  onChange={(e) => update(type.value, 'contact_name', e.target.value)}
                />
              </div>
            </div>
            <div className={adminStyles.formGrid2}>
              <div className={adminStyles.fieldGroup}>
                <label className={adminStyles.fieldLabel}>Phone</label>
                <input
                  className={adminStyles.fieldInput}
                  value={u.contact_phone}
                  onChange={(e) => update(type.value, 'contact_phone', e.target.value)}
                />
              </div>
              <div className={adminStyles.fieldGroup}>
                <label className={adminStyles.fieldLabel}>Email</label>
                <input
                  className={adminStyles.fieldInput}
                  type="email"
                  value={u.contact_email}
                  onChange={(e) => update(type.value, 'contact_email', e.target.value)}
                />
              </div>
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Contact Comments (admin only)</label>
              <textarea
                className={adminStyles.fieldTextarea}
                value={u.contact_comments}
                onChange={(e) => update(type.value, 'contact_comments', e.target.value)}
              />
            </div>

            <div className={adminStyles.utilityContactHeader}>Entries</div>

            {entries.length === 0 && addingFor !== type.value && (
              <p style={{ fontSize: '0.82rem', color: '#718096', marginBottom: '0.75rem' }}>
                No entries yet.
              </p>
            )}

            {entries.map((entry) =>
              editingEntryId === entry.id ? (
                <div className={adminStyles.utilityEntryForm} key={entry.id}>
                  <div className={adminStyles.formGrid3}>
                    <div className={adminStyles.fieldGroup}>
                      <label className={adminStyles.fieldLabel}>Application</label>
                      <input
                        className={adminStyles.fieldInput}
                        value={editEntry.application}
                        onChange={(e) => setEditEntry((p) => ({ ...p, application: e.target.value }))}
                      />
                    </div>
                    <div className={adminStyles.fieldGroup}>
                      <label className={adminStyles.fieldLabel}>Work Request #</label>
                      <input
                        className={adminStyles.fieldInput}
                        value={editEntry.work_request_number}
                        onChange={(e) => setEditEntry((p) => ({ ...p, work_request_number: e.target.value }))}
                      />
                    </div>
                    <div className={adminStyles.fieldGroup}>
                      <label className={adminStyles.fieldLabel}>Status</label>
                      <select
                        className={adminStyles.fieldInput}
                        value={editEntry.status}
                        onChange={(e) => setEditEntry((p) => ({ ...p, status: e.target.value }))}
                      >
                        {UTILITY_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={adminStyles.formGrid2}>
                    <div className={adminStyles.fieldGroup}>
                      <label className={adminStyles.fieldLabel}>Action Step (admin only)</label>
                      <textarea
                        className={adminStyles.fieldTextarea}
                        value={editEntry.action_step}
                        onChange={(e) => setEditEntry((p) => ({ ...p, action_step: e.target.value }))}
                      />
                    </div>
                    <div className={adminStyles.fieldGroup}>
                      <label className={adminStyles.fieldLabel}>Comments (admin only)</label>
                      <textarea
                        className={adminStyles.fieldTextarea}
                        value={editEntry.comments}
                        onChange={(e) => setEditEntry((p) => ({ ...p, comments: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className={adminStyles.entryFormActions}>
                    <button
                      type="button"
                      className="btn-navy"
                      onClick={() => saveEditEntry(entry.id)}
                      disabled={entrySaving}
                    >
                      {entrySaving ? 'Saving...' : 'Save entry'}
                    </button>
                    <button type="button" className={adminStyles.cancelBtn} onClick={cancelEditEntry}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={adminStyles.utilityEntryBlock} key={entry.id}>
                  <div className={adminStyles.utilityEntryGrid}>
                    <div className={adminStyles.utilityEntryField}>
                      <div className={adminStyles.ufLabel}>Application</div>
                      <div className={adminStyles.ufValue}>{entry.application || '—'}</div>
                    </div>
                    <div className={adminStyles.utilityEntryField}>
                      <div className={adminStyles.ufLabel}>Work Request #</div>
                      <div className={adminStyles.ufValue}>{entry.work_request_number || '—'}</div>
                    </div>
                    <div className={adminStyles.utilityEntryField}>
                      <div className={adminStyles.ufLabel}>Status</div>
                      <div className={adminStyles.ufValue}>{statusLabel(entry.status)}</div>
                    </div>
                    <div className={adminStyles.utilityEntryField}>
                      <div className={adminStyles.ufLabel}>Action Step</div>
                      <div className={adminStyles.ufValue}>{entry.action_step || '—'}</div>
                    </div>
                    <div className={adminStyles.utilityEntryField}>
                      <div className={adminStyles.ufLabel}>Comments</div>
                      <div className={adminStyles.ufValue}>{entry.comments || '—'}</div>
                    </div>
                  </div>
                  <div className={adminStyles.utilityEntryActions}>
                    <button
                      type="button"
                      className={adminStyles.iconBtn}
                      onClick={() => startEditEntry(entry)}
                      aria-label="Edit entry"
                    >
                      <i className="ti ti-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      className={adminStyles.iconBtn}
                      onClick={() => deleteEntry(entry.id)}
                      aria-label="Delete entry"
                    >
                      <i className="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              )
            )}

            {addingFor === type.value ? (
              <div className={adminStyles.utilityEntryForm}>
                <div className={adminStyles.formGrid3}>
                  <div className={adminStyles.fieldGroup}>
                    <label className={adminStyles.fieldLabel}>Application</label>
                    <input
                      className={adminStyles.fieldInput}
                      value={newEntry.application}
                      onChange={(e) => setNewEntry((p) => ({ ...p, application: e.target.value }))}
                    />
                  </div>
                  <div className={adminStyles.fieldGroup}>
                    <label className={adminStyles.fieldLabel}>Work Request #</label>
                    <input
                      className={adminStyles.fieldInput}
                      value={newEntry.work_request_number}
                      onChange={(e) => setNewEntry((p) => ({ ...p, work_request_number: e.target.value }))}
                    />
                  </div>
                  <div className={adminStyles.fieldGroup}>
                    <label className={adminStyles.fieldLabel}>Status</label>
                    <select
                      className={adminStyles.fieldInput}
                      value={newEntry.status}
                      onChange={(e) => setNewEntry((p) => ({ ...p, status: e.target.value }))}
                    >
                      {UTILITY_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={adminStyles.formGrid2}>
                  <div className={adminStyles.fieldGroup}>
                    <label className={adminStyles.fieldLabel}>Action Step (admin only)</label>
                    <textarea
                      className={adminStyles.fieldTextarea}
                      value={newEntry.action_step}
                      onChange={(e) => setNewEntry((p) => ({ ...p, action_step: e.target.value }))}
                    />
                  </div>
                  <div className={adminStyles.fieldGroup}>
                    <label className={adminStyles.fieldLabel}>Comments (admin only)</label>
                    <textarea
                      className={adminStyles.fieldTextarea}
                      value={newEntry.comments}
                      onChange={(e) => setNewEntry((p) => ({ ...p, comments: e.target.value }))}
                    />
                  </div>
                </div>
                <div className={adminStyles.entryFormActions}>
                  <button
                    type="button"
                    className="btn-navy"
                    onClick={() => saveNewEntry(u)}
                    disabled={entrySaving}
                  >
                    {entrySaving ? 'Saving...' : 'Save entry'}
                  </button>
                  <button type="button" className={adminStyles.cancelBtn} onClick={cancelAddEntry}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className={adminStyles.addRowBtn} onClick={() => startAddEntry(type.value)}>
                <i className="ti ti-plus" aria-hidden="true"></i> Add entry
              </button>
            )}
          </div>
        );
      })}

      {message && (
        <p className={message === 'Saved.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError} style={{ marginTop: '0.75rem' }}>
          {message}
        </p>
      )}

      <div className={adminStyles.saveBar}>
        <button type="button" className="btn-navy" onClick={handleSaveContact} disabled={saving}>
          {saving ? 'Saving...' : 'Save utilities'}
        </button>
      </div>
    </div>
  );
}
