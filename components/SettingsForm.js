'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function SettingsForm({ profile, email }) {
  const supabase = createClient();
  const router = useRouter();
  const [retakingTour, setRetakingTour] = useState(false);

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword.length < 8) {
      setPasswordMessage('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match.');
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      setPasswordMessage('Could not update your password. Please try again.');
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('Password updated.');
  }

  async function handleRetakeTour() {
    setRetakingTour(true);
    await supabase.from('profiles').update({ has_seen_portal_tour: false }).eq('id', profile.id);
    router.push('/portal');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, phone, email_notifications: emailNotifications })
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
    border: '1px solid rgba(var(--border-rgb),0.2)',
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
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem',
    fontWeight: 500,
  };

  return (
    <>
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
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--gold)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>
            Email me when there&apos;s an update on my project
          </span>
        </label>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.35rem', marginLeft: '1.6rem' }}>
          New documents, photos, notes, and status changes
        </p>
      </div>
      {message && (
        <p style={{ fontSize: '0.82rem', color: message.includes('saved') ? 'var(--text-success)' : 'var(--text-error)', marginBottom: '1rem' }}>
          {message}
        </p>
      )}
      <button type="submit" className="btn-navy" disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>

    <form onSubmit={handleChangePassword} style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(var(--border-rgb),0.12)' }}>
      <h3 style={{ marginBottom: '1rem' }}>Change Password</h3>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>New Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>Confirm New Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
        />
      </div>
      {passwordMessage && (
        <p style={{ fontSize: '0.82rem', color: passwordMessage.includes('updated') ? 'var(--text-success)' : 'var(--text-error)', marginBottom: '1rem' }}>
          {passwordMessage}
        </p>
      )}
      <button type="submit" className="btn-navy" disabled={changingPassword}>
        {changingPassword ? 'Updating...' : 'Update Password'}
      </button>
    </form>

    {!profile?.is_admin && !profile?.is_employee && (
      <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(var(--border-rgb),0.12)' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Portal Tour</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Walk through the portal&apos;s sections again.
        </p>
        <button
          type="button"
          onClick={handleRetakeTour}
          disabled={retakingTour}
          style={{
            background: 'none',
            border: '1px solid rgba(var(--border-rgb),0.25)',
            color: 'var(--navy)',
            padding: '0.6rem 1.1rem',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {retakingTour ? 'Starting...' : 'Take the tour again'}
        </button>
      </div>
    )}
    </>
  );
}
