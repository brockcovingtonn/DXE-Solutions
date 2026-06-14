'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

export default function MilestonesEditor({ projectId, initialMilestones }) {
  const router = useRouter();

  const [milestones, setMilestones] = useState(
    initialMilestones.map((m) => ({ name: m.name, display_date: m.display_date || '', state: m.state }))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(index, field, value) {
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function remove(index) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  function add() {
    setMilestones((prev) => [...prev, { name: '', display_date: '', state: 'pending' }]);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/milestones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, milestones }),
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

  return (
    <div>
      {milestones.map((m, i) => (
        <div className={adminStyles.milestoneRow} key={i}>
          <input
            placeholder="Milestone name"
            value={m.name}
            onChange={(e) => update(i, 'name', e.target.value)}
          />
          <input
            placeholder="Date (e.g. Aug 14, 2025)"
            value={m.display_date}
            onChange={(e) => update(i, 'display_date', e.target.value)}
            style={{ gridColumn: 'span 1' }}
          />
          <select value={m.state} onChange={(e) => update(i, 'state', e.target.value)}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
          </select>
          <button type="button" className={adminStyles.iconBtn} onClick={() => remove(i)} aria-label="Remove milestone">
            <i className="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>
      ))}

      <button type="button" className={adminStyles.addRowBtn} onClick={add}>
        <i className="ti ti-plus" aria-hidden="true"></i> Add milestone
      </button>

      {message && (
        <p className={message === 'Saved.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError} style={{ marginTop: '0.75rem' }}>
          {message}
        </p>
      )}

      <div className={adminStyles.saveBar}>
        <button type="button" className="btn-navy" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save milestones'}
        </button>
      </div>
    </div>
  );
}
