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
    apn: project.apn || '',
    jurisdiction: project.jurisdiction || '',
    zoning: project.zoning || '',
    lot_size: project.lot_size || '',
    building_size: project.building_size || '',
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

      <h3
        style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '1.1rem',
          margin: '1.5rem 0 1rem',
          color: 'var(--navy)',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(var(--border-rgb),0.08)',
        }}
      >
        Permitting details
      </h3>

      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>APN / Parcel Number</label>
          <input
            className={adminStyles.fieldInput}
            name="apn"
            value={form.apn}
            onChange={handleChange}
            placeholder="e.g. 4356-021-015"
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Jurisdiction</label>
          <input
            className={adminStyles.fieldInput}
            name="jurisdiction"
            value={form.jurisdiction}
            onChange={handleChange}
            placeholder="e.g. City of Los Angeles"
          />
        </div>
      </div>

      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Zoning</label>
          <input
            className={adminStyles.fieldInput}
            name="zoning"
            value={form.zoning}
            onChange={handleChange}
            placeholder="e.g. R-1"
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Lot Size</label>
          <input
            className={adminStyles.fieldInput}
            name="lot_size"
            value={form.lot_size}
            onChange={handleChange}
            placeholder="e.g. 6,500 sq ft"
          />
        </div>
      </div>

      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Building Size</label>
        <input
          className={adminStyles.fieldInput}
          name="building_size"
          value={form.building_size}
          onChange={handleChange}
          placeholder="e.g. 3,200 sq ft"
        />
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
        Permit numbers and status are tracked per-permit below, in the Permits section.
      </p>

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
