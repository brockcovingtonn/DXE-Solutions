'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

export default function ProjectEmployeesForm({ projectId, allEmployees, assignedEmployeeIds }) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set(assignedEmployeeIds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function toggle(employeeId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/admin/projects/${projectId}/employees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: Array.from(selected) }),
      });

      if (!res.ok) throw new Error();

      setMessage('Saved.');
      router.refresh();
    } catch {
      setMessage('Could not save assignments.');
    } finally {
      setSaving(false);
    }
  }

  if (!allEmployees || allEmployees.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: '#718096' }}>No employees exist yet to assign.</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {allEmployees.map((employee) => (
          <label
            key={employee.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.6rem 0.75rem',
              border: '1px solid rgba(62,84,104,0.12)',
              background: selected.has(employee.id) ? 'var(--surface)' : 'transparent',
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(employee.id)}
              onChange={() => toggle(employee.id)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--gold)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.88rem', color: 'var(--navy)', flex: 1 }}>
              {employee.first_name} {employee.last_name}
            </span>
          </label>
        ))}
      </div>

      {message && (
        <p className={message === 'Saved.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError}>
          {message}
        </p>
      )}

      <div className={adminStyles.saveBar}>
        <button type="button" className="btn-navy" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save assignments'}
        </button>
      </div>
    </div>
  );
}
