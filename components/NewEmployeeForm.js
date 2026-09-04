'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

const initialState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
};

export default function NewEmployeeForm() {
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
      const res = await fetch('/api/admin/employees', {
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

      router.push(`/admin/employees/${data.employeeId}`);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  }

  return (
    <form className={adminStyles.adminForm} onSubmit={handleSubmit}>
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

      {error && <p className={adminStyles.formMsgError}>{error}</p>}

      <div className={adminStyles.saveBar}>
        <button type="submit" className="btn-navy" disabled={status === 'saving'}>
          {status === 'saving' ? 'Creating...' : 'Create employee login'}
        </button>
      </div>
    </form>
  );
}
