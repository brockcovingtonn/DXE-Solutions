'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { TRADE_OPTIONS } from '@/lib/constants';

export default function ContactForm({ contact, allProjects, linkedProjectIds, contactId }) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: contact?.name || '',
    company: contact?.company || '',
    trade: contact?.trade || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    notes: contact?.notes || '',
  });
  const [selectedProjects, setSelectedProjects] = useState(new Set(linkedProjectIds || []));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleProject(projectId) {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    const payload = { ...form, projectIds: Array.from(selectedProjects) };

    try {
      const url = contactId ? `/api/admin/contacts/${contactId}` : '/api/admin/contacts';
      const method = contactId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      if (contactId) {
        setMessage('Saved.');
        router.refresh();
      } else {
        router.push('/admin/contacts');
      }
    } catch {
      setMessage('Could not save contact.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this contact? This cannot be undone.')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/admin/contacts');
    } catch {
      setMessage('Could not delete contact.');
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Name</label>
          <input className={adminStyles.fieldInput} name="name" value={form.name} onChange={handleChange} />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Company</label>
          <input className={adminStyles.fieldInput} name="company" value={form.company} onChange={handleChange} />
        </div>
      </div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Trade / Role</label>
          <select className={adminStyles.fieldInput} name="trade" value={form.trade} onChange={handleChange}>
            <option value="">Select...</option>
            {TRADE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Phone</label>
          <input className={adminStyles.fieldInput} name="phone" value={form.phone} onChange={handleChange} />
        </div>
      </div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Email</label>
          <input className={adminStyles.fieldInput} name="email" type="email" value={form.email} onChange={handleChange} />
        </div>
        <div></div>
      </div>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Notes</label>
        <textarea className={adminStyles.fieldTextarea} name="notes" value={form.notes} onChange={handleChange} />
      </div>

      <div className={adminStyles.utilityContactHeader} style={{ marginTop: '1.25rem' }}>
        Link to projects
      </div>
      {allProjects && allProjects.length > 0 ? (
        <div className={adminStyles.projectCheckGrid}>
          {allProjects.map((p) => (
            <label key={p.id} className={adminStyles.projectCheckLabel}>
              <input
                type="checkbox"
                checked={selectedProjects.has(p.id)}
                onChange={() => toggleProject(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '0.82rem', color: '#718096' }}>No projects yet.</p>
      )}

      {message && (
        <p className={message === 'Saved.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError}>
          {message}
        </p>
      )}

      <div className={adminStyles.saveBar}>
        <button type="button" className="btn-navy" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : contactId ? 'Save contact' : 'Create contact'}
        </button>
        {contactId && (
          <button
            type="button"
            className={adminStyles.cancelBtn}
            onClick={handleDelete}
            disabled={deleting}
            style={{ color: '#b91c1c', borderColor: 'rgba(185,28,28,0.3)' }}
          >
            {deleting ? 'Deleting...' : 'Delete contact'}
          </button>
        )}
      </div>
    </div>
  );
}
