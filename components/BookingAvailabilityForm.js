'use client';

import { useState } from 'react';

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

function toRowState(weeklyHours) {
  const rows = {};
  for (const { key } of DAYS) {
    const window = weeklyHours?.[key]?.[0];
    rows[key] = window ? { open: true, start: window.start, end: window.end } : { open: false, start: '09:00', end: '17:00' };
  }
  return rows;
}

function toWeeklyHours(rows) {
  const weeklyHours = {};
  for (const { key } of DAYS) {
    weeklyHours[key] = rows[key].open ? [{ start: rows[key].start, end: rows[key].end }] : [];
  }
  return weeklyHours;
}

export default function BookingAvailabilityForm({ initialAvailability }) {
  const [rows, setRows] = useState(() => toRowState(initialAvailability?.weekly_hours));
  const [sessionMinutes, setSessionMinutes] = useState(initialAvailability?.session_minutes ?? 15);
  const [bufferMinutes, setBufferMinutes] = useState(initialAvailability?.buffer_minutes ?? 10);
  const [minNoticeHours, setMinNoticeHours] = useState(initialAvailability?.min_notice_hours ?? 4);
  const [maxDaysOut, setMaxDaysOut] = useState(initialAvailability?.max_days_out ?? 14);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function updateRow(key, patch) {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/admin/booking-availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionMinutes: Number(sessionMinutes),
          bufferMinutes: Number(bufferMinutes),
          minNoticeHours: Number(minNoticeHours),
          maxDaysOut: Number(maxDaysOut),
          weeklyHours: toWeeklyHours(rows),
        }),
      });
      if (!res.ok) throw new Error('Could not save.');
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '0.78rem' }}>
          Session length (min)
          <input type="number" min="5" step="5" value={sessionMinutes} onChange={(e) => setSessionMinutes(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
        </label>
        <label style={{ fontSize: '0.78rem' }}>
          Buffer (min)
          <input type="number" min="0" step="5" value={bufferMinutes} onChange={(e) => setBufferMinutes(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
        </label>
        <label style={{ fontSize: '0.78rem' }}>
          Min. notice (hrs)
          <input type="number" min="0" value={minNoticeHours} onChange={(e) => setMinNoticeHours(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
        </label>
        <label style={{ fontSize: '0.78rem' }}>
          Book up to (days)
          <input type="number" min="1" value={maxDaysOut} onChange={(e) => setMaxDaysOut(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {DAYS.map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 130 }}>
              <input type="checkbox" checked={rows[key].open} onChange={(e) => updateRow(key, { open: e.target.checked })} />
              {label}
            </label>
            {rows[key].open ? (
              <>
                <input type="time" value={rows[key].start} onChange={(e) => updateRow(key, { start: e.target.value })} />
                <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                <input type="time" value={rows[key].end} onChange={(e) => updateRow(key, { end: e.target.value })} />
              </>
            ) : (
              <span style={{ color: 'var(--text-tertiary)' }}>Closed</span>
            )}
          </div>
        ))}
      </div>

      {error ? <p style={{ fontSize: '0.82rem', color: '#b45252', marginBottom: '0.75rem' }}>{error}</p> : null}
      {saved ? <p style={{ fontSize: '0.82rem', color: 'var(--navy)', marginBottom: '0.75rem' }}>Saved.</p> : null}
      <button type="button" className="btn-navy" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save availability'}
      </button>
    </div>
  );
}
