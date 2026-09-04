'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

export default function EmployeeInfoForm({ employee }) {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: employee.first_name || '',
    lastName: employee.last_name || '',
    phone: employee.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/admin/employees/${employee.id}`, {
        method: 'PUT',
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

  async function handleRemove() {
    if (!window.confirm(`Remove ${employee.first_name}'s account? They will immediately lose access.`)) {
      return;
    }

    setRemoving(true);

    try {
      const res = await fetch(`/api/admin/employees/${employee.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/admin/employees');
    } catch {
      setMessage('Could not remove this employee.');
      setRemoving(false);
    }
  }

  return (
    <div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>First name</label>
          <input
            className={adminStyles.fieldInput}
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Last name</label>
          <input
            className={adminStyles.fieldInput}
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Email</label>
          <input className={adminStyles.fieldInput} value={employee.email || ''} disabled />
          <p className={adminStyles.fieldHint}>This is their login email and can&apos;t be changed here.</p>
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Phone</label>
          <input
            className={adminStyles.fieldInput}
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />
        </div>
      </div>

      {message && (
        <p className={message === 'Saved.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError}>
          {message}
        </p>
      )}

      <div className={adminStyles.saveBar} style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn-navy" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save employee'}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          style={{
            background: 'none',
            border: '1px solid #dc2626',
            color: '#dc2626',
            padding: '0.7rem 1.4rem',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {removing ? 'Removing...' : 'Remove employee'}
        </button>
      </div>
    </div>
  );
}
