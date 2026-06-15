'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { PROJECT_TYPES } from '@/lib/constants';

export default function ProjectInfoForm({ project }) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: project.name || '',
    address: project.address || '',
    project_type: project.project_type || '',
    started_on: project.started_on || '',
    estimated_completion: project.estimated_completion || '',
    progress_pct: project.progress_pct ?? 0,
    status: project.status || 'planning',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'progress_pct' ? Number(value) : value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    <form onSubmit={handleSave} className={adminStyles.adminForm}>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Project name</label>
        <input
          className={adminStyles.fieldInput}
          name="name"
          value={form.name}
          onChange={handleChange}
        />
      </div>

      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Address</label>
        <input
          className={adminStyles.fieldInput}
          name="address"
          value={form.address}
          onChange={handleChange}
        />
      </div>

      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Project type</label>
          <select
            className={adminStyles.fieldInput}
            name="project_type"
            value={form.project_type}
            onChange={handleChange}
          >
            <option value="">Select type...</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Status</label>
          <select
            className={adminStyles.fieldInput}
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on-hold">On hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Start date</label>
          <input
            className={adminStyles.fieldInput}
            type="date"
            name="started_on"
            value={form.started_on || ''}
            onChange={handleChange}
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Est. completion</label>
          <input
            className={adminStyles.fieldInput}
            type="date"
            name="estimated_completion"
            value={form.estimated_completion || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Overall progress: {form.progress_pct}%</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          name="progress_pct"
          value={form.progress_pct}
          onChange={handleChange}
          style={{ width: '100%' }}
        />
      </div>

      {message && (
        <p className={message === 'Saved.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError}>
          {message}
        </p>
      )}

      <div className={adminStyles.saveBar}>
        <button type="submit" className="btn-navy" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
