'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { PHASE_STATES } from '@/lib/constants';

export default function PhasesEditor({ projectId, initialPhases }) {
  const router = useRouter();

  const [phases, setPhases] = useState(
    initialPhases.length > 0
      ? initialPhases.map((p) => ({ name: p.name, pct: p.pct, state: p.state }))
      : []
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function updatePhase(index, field, value) {
    setPhases((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: field === 'pct' ? Number(value) : value } : p))
    );
  }

  function removePhase(index) {
    setPhases((prev) => prev.filter((_, i) => i !== index));
  }

  function addPhase() {
    setPhases((prev) => [...prev, { name: '', pct: 0, state: 'pending' }]);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/phases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, phases }),
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
      {phases.map((phase, i) => (
        <div className={adminStyles.editableRow} key={i}>
          <input
            placeholder="Phase name"
            value={phase.name}
            onChange={(e) => updatePhase(i, 'name', e.target.value)}
          />
          <input
            type="number"
            min="0"
            max="100"
            placeholder="%"
            value={phase.pct}
            onChange={(e) => updatePhase(i, 'pct', e.target.value)}
            disabled={phase.state === 'na'}
          />
          <select value={phase.state} onChange={(e) => updatePhase(i, 'state', e.target.value)}>
            {PHASE_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button type="button" className={adminStyles.iconBtn} onClick={() => removePhase(i)} aria-label="Remove phase">
            <i className="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>
      ))}

      <button type="button" className={adminStyles.addRowBtn} onClick={addPhase}>
        <i className="ti ti-plus" aria-hidden="true"></i> Add phase
      </button>

      {message && (
        <p className={message === 'Saved.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError} style={{ marginTop: '0.75rem' }}>
          {message}
        </p>
      )}

      <div className={adminStyles.saveBar}>
        <button type="button" className="btn-navy" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save phases'}
        </button>
      </div>
    </div>
  );
}
