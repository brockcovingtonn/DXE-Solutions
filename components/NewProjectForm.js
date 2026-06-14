'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

const initialState = {
  projectName: '',
  address: '',
  projectType: '',
  estimatedValue: '',
  startedOn: '',
  estimatedCompletion: '',
};

export default function NewProjectForm({ clientId }) {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setError('');

    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: clientId, ...form }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setStatus('idle');
        return;
      }

      router.push(`/admin/projects/${data.projectId}`);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  }

  return (
    <form className={adminStyles.adminForm} onSubmit={handleSubmit}>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Project name</label>
        <input
          className={adminStyles.fieldInput}
          name="projectName"
          value={form.projectName}
          onChange={handleChange}
          placeholder="e.g. Calabasas Estate"
          required
        />
      </div>

      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Address</label>
        <input
          className={adminStyles.fieldInput}
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Street, City, State"
        />
      </div>

      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Project type</label>
          <input
            className={adminStyles.fieldInput}
            name="projectType"
            value={form.projectType}
            onChange={handleChange}
            placeholder="Residential — New Construction"
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Estimated value</label>
          <input
            className={adminStyles.fieldInput}
            name="estimatedValue"
            value={form.estimatedValue}
            onChange={handleChange}
            placeholder="$4.2M"
          />
        </div>
      </div>

      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Start date</label>
          <input
            className={adminStyles.fieldInput}
            type="date"
            name="startedOn"
            value={form.startedOn}
            onChange={handleChange}
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Est. completion</label>
          <input
            className={adminStyles.fieldInput}
            type="date"
            name="estimatedCompletion"
            value={form.estimatedCompletion}
            onChange={handleChange}
          />
        </div>
      </div>

      {error && <p className={adminStyles.formMsgError}>{error}</p>}

      <div className={adminStyles.saveBar}>
        <button type="submit" className="btn-navy" disabled={status === 'saving'}>
          {status === 'saving' ? 'Creating...' : 'Create project'}
        </button>
      </div>
    </form>
  );
}
