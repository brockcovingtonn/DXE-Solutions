'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function SettingsForm({ profile, email }) {
  const supabase = createClient();

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, phone })
      .eq('id', profile.id);

    if (error) {
      setMessage('Could not save changes. Please try again.');
    } else {
      setMessage('Changes saved.');
    }
    setSaving(false);
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid rgba(11,31,58,0.15)',
    background: 'var(--cream)',
    color: 'var(--navy)',
    padding: '0.7rem',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.7rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#718096',
    marginBottom: '0.5rem',
    fontWeight: 500,
  };

  return (
    <form onSubmit={handleSave}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Email Address</label>
        <input type="email" value={email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(818) 555-0000"
          style={inputStyle}
        />
      </div>
      {message && (
        <p style={{ fontSize: '0.82rem', color: message.includes('saved') ? '#065f46' : '#dc2626', marginBottom: '1rem' }}>
          {message}
        </p>
      )}
      <button type="submit" className="btn-navy" disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
