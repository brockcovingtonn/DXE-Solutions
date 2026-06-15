'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

export default function ClientInfoForm({ client }) {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: client.first_name || '',
    lastName: client.last_name || '',
    email: client.email || '',
    phone: client.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
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
          <input
            className={adminStyles.fieldInput}
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
          <p className={adminStyles.fieldHint}>
            This updates the contact email on file. It does not change the email used to log in.
          </p>
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

      <div className={adminStyles.saveBar}>
        <button type="button" className="btn-navy" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save client'}
        </button>
      </div>
    </div>
  );
}
