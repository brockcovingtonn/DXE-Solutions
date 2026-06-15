'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { PROJECT_TYPES } from '@/lib/constants';

const initialState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  projectName: '',
  address: '',
  projectType: '',
  startedOn: '',
  estimatedCompletion: '',
};

export default function NewClientForm() {
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
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--navy)' }}>
        Client login
      </h3>

      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>First name</label>
          <input
            className={adminStyles.fieldInput}
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Last name</label>
          <input
            className={adminStyles.fieldInput}
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Email (their login)</label>
          <input
            className={adminStyles.fieldInput}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Temporary password</label>
          <input
            className={adminStyles.fieldInput}
            type="text"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="They can change this later"
            required
            minLength={6}
          />
        </div>
      </div>

      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Phone (optional)</label>
        <input
          className={adminStyles.fieldInput}
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="(818) 555-0000"
        />
      </div>

      <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', margin: '1.5rem 0 1rem', color: 'var(--navy)', paddingTop: '1.5rem', borderTop: '1px solid rgba(11,31,58,0.06)' }}>
        First project
      </h3>

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

      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Project type</label>
        <select
          className={adminStyles.fieldInput}
          name="projectType"
          value={form.projectType}
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
          {status === 'saving' ? 'Creating...' : 'Create client & project'}
        </button>
      </div>
    </form>
  );
}
