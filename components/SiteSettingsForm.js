'use client';

import { useState } from 'react';

export default function SiteSettingsForm({ initialSettings }) {
  const [googleBookingEnabled, setGoogleBookingEnabled] = useState(initialSettings.googleBookingEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function toggle(next) {
    setGoogleBookingEnabled(next);
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleBookingEnabled: next }),
      });
      if (!res.ok) throw new Error('Could not save.');
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setGoogleBookingEnabled(!next);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid rgba(62,84,104,0.12)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>Google Calendar booking on "Book a call"</div>
          <div style={{ fontSize: 13, color: '#5b6472', marginTop: 2 }}>
            When on, submitting the public "Book a 15-min call" form shows a Google Calendar scheduling widget
            so the visitor can pick a time immediately. When off, they just see the confirmation message.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={googleBookingEnabled}
          onClick={() => toggle(!googleBookingEnabled)}
          disabled={saving}
          style={{
            flexShrink: 0,
            width: 46,
            height: 26,
            borderRadius: 13,
            border: 'none',
            padding: 3,
            background: googleBookingEnabled ? '#3E5468' : '#d8dee4',
            cursor: saving ? 'default' : 'pointer',
            position: 'relative',
            transition: 'background 0.15s ease',
          }}
        >
          <span
            style={{
              display: 'block',
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#fff',
              transform: googleBookingEnabled ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>
      </div>

      {error ? <div style={{ fontSize: 13, color: '#b45252', marginTop: 10 }}>{error}</div> : null}
      {saved ? <div style={{ fontSize: 13, color: '#3E5468', marginTop: 10 }}>Saved.</div> : null}
    </div>
  );
}
