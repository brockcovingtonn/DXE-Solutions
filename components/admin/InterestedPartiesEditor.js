'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

export default function InterestedPartiesEditor({ projectId, initialParties }) {
  const router = useRouter();

  const [parties, setParties] = useState(
    initialParties.map((p) => ({
      name: p.name || '',
      relationship: p.relationship || '',
      phone: p.phone || '',
      email: p.email || '',
    }))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(index, field, value) {
    setParties((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function remove(index) {
    setParties((prev) => prev.filter((_, i) => i !== index));
  }

  function add() {
    setParties((prev) => [...prev, { name: '', relationship: '', phone: '', email: '' }]);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/interested-parties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, parties }),
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
      {parties.map((party, i) => (
        <div className={adminStyles.teamRow} key={i}>
          <input
            placeholder="Relationship (Owner, LLC, Co-Owner...)"
            value={party.relationship}
            onChange={(e) => update(i, 'relationship', e.target.value)}
          />
          <input
            placeholder="Name"
            value={party.name}
            onChange={(e) => update(i, 'name', e.target.value)}
          />
          <input
            placeholder="Phone"
            value={party.phone}
            onChange={(e) => update(i, 'phone', e.target.value)}
          />
          <input
            placeholder="Email"
            type="email"
            value={party.email}
            onChange={(e) => update(i, 'email', e.target.value)}
          />
          <button type="button" className={adminStyles.iconBtn} onClick={() => remove(i)} aria-label="Remove interested party">
            <i className="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>
      ))}

      <button type="button" className={adminStyles.addRowBtn} onClick={add}>
        <i className="ti ti-plus" aria-hidden="true"></i> Add interested party
      </button>

      {message && (
        <p className={message === 'Saved.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError} style={{ marginTop: '0.75rem' }}>
          {message}
        </p>
      )}

      <div className={adminStyles.saveBar}>
        <button type="button" className="btn-navy" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save interested parties'}
        </button>
      </div>
    </div>
  );
}
