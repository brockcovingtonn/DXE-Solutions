'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

export default function EmployeeProjectsForm({ employeeId, allProjects, assignedProjectIds }) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set(assignedProjectIds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function toggle(projectId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/admin/employees/${employeeId}/projects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: Array.from(selected) }),
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

  if (!allProjects || allProjects.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No projects exist yet to assign.</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {allProjects.map((project) => (
          <label
            key={project.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.6rem 0.75rem',
              border: '1px solid rgba(var(--border-rgb),0.12)',
              background: selected.has(project.id) ? 'var(--surface)' : 'transparent',
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(project.id)}
              onChange={() => toggle(project.id)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--gold)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.88rem', color: 'var(--navy)', flex: 1 }}>{project.name}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {project.status}
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
