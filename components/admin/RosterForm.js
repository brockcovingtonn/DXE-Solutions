'use client';

import adminStyles from '@/components/admin.module.css';

// Module-scope so it isn't re-created each render of its parent — a
// nested component definition remounts on every keystroke and drops
// input focus. Shared by ProjectTeamEditor and InterestedPartiesEditor.
export default function RosterForm({
  draft,
  setDraft,
  firstFieldKey = 'trade',
  tradeLabel,
  tradeListId,
  tradePlaceholder,
  busy,
  onSave,
  onCancel,
}) {
  const field = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  return (
    <div className={adminStyles.rosterForm}>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>{tradeLabel}</label>
          <input
            className={adminStyles.fieldInput}
            list={tradeListId}
            value={draft[firstFieldKey] || ''}
            onChange={field(firstFieldKey)}
            placeholder={tradePlaceholder}
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Name</label>
          <input className={adminStyles.fieldInput} value={draft.name} onChange={field('name')} />
        </div>
      </div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Phone</label>
          <input className={adminStyles.fieldInput} value={draft.phone} onChange={field('phone')} />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Email</label>
          <input className={adminStyles.fieldInput} type="email" value={draft.email} onChange={field('email')} />
        </div>
      </div>
      <div className={adminStyles.entryFormActions}>
        <button type="button" className="btn-navy" onClick={onSave} disabled={busy || !draft.name?.trim()}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className={adminStyles.cancelBtn} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
