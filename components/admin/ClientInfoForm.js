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
    emailNotifications: client.email_notifications ?? false,
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

      <div className={adminStyles.fieldGroup} style={{ marginTop: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.emailNotifications}
            onChange={(e) => setForm((prev) => ({ ...prev, emailNotifications: e.target.checked }))}
            style={{ width: '16px', height: '16px', accentColor: 'var(--gold)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            Send update emails to this client
          </span>
        </label>
        <p className={adminStyles.fieldHint} style={{ marginLeft: '1.6rem' }}>
          When on, the client is emailed about new photos, documents, notes, and status changes. Off by default.
        </p>
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
