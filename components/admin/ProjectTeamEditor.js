'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { TRADE_OPTIONS } from '@/lib/constants';

const CUSTOM_VALUE = '__custom__';

export default function ProjectTeamEditor({ projectId, initialTeam }) {
  const router = useRouter();

  const [team, setTeam] = useState(
    initialTeam.map((m) => ({ trade: m.trade, name: m.name || '', phone: m.phone || '', email: m.email || '' }))
  );
  // Tracks which rows are in "custom trade" entry mode
  const [customRows, setCustomRows] = useState(() =>
    new Set(initialTeam.map((m, i) => (TRADE_OPTIONS.includes(m.trade) ? null : i)).filter((i) => i !== null))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(index, field, value) {
    setTeam((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function handleTradeSelect(index, value) {
    if (value === CUSTOM_VALUE) {
      setCustomRows((prev) => new Set(prev).add(index));
      update(index, 'trade', '');
    } else {
      setCustomRows((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      update(index, 'trade', value);
    }
  }

  function remove(index) {
    setTeam((prev) => prev.filter((_, i) => i !== index));
    setCustomRows((prev) => {
      const next = new Set();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  }

  function add() {
    setTeam((prev) => [...prev, { trade: TRADE_OPTIONS[0], name: '', phone: '', email: '' }]);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, team }),
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
      {team.map((member, i) => (
        <div className={adminStyles.teamRow} key={i}>
          {customRows.has(i) ? (
            <input
              placeholder="Trade / Title"
              value={member.trade}
              onChange={(e) => update(i, 'trade', e.target.value)}
            />
          ) : (
            <select value={member.trade} onChange={(e) => handleTradeSelect(i, e.target.value)}>
              {TRADE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value={CUSTOM_VALUE}>+ Add new trade...</option>
            </select>
          )}
          <input
            placeholder="Name"
            value={member.name}
            onChange={(e) => update(i, 'name', e.target.value)}
          />
          <input
            placeholder="Phone"
            value={member.phone}
            onChange={(e) => update(i, 'phone', e.target.value)}
          />
          <input
            placeholder="Email"
            type="email"
            value={member.email}
            onChange={(e) => update(i, 'email', e.target.value)}
          />
          <button type="button" className={adminStyles.iconBtn} onClick={() => remove(i)} aria-label="Remove team member">
            <i className="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>
      ))}

      <button type="button" className={adminStyles.addRowBtn} onClick={add}>
        <i className="ti ti-plus" aria-hidden="true"></i> Add team member
      </button>

      {message && (
        <p className={message === 'Saved.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError} style={{ marginTop: '0.75rem' }}>
          {message}
        </p>
      )}

      <div className={adminStyles.saveBar}>
        <button type="button" className="btn-navy" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save team'}
        </button>
      </div>
    </div>
  );
}
