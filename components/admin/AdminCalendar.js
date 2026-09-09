'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import AddToCalendarLink from '@/components/AddToCalendarLink';
import adminStyles from '@/components/admin.module.css';
import CalendarEventModal, { emptyEventForm, eventToForm, formToPayload } from '@/components/admin/CalendarEventModal';

export default function AdminCalendar({ initialEvents, projects, people, contacts, googleConnected }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get('google');

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyEventForm());
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleAdd() {
    if (!form.title.trim() || !form.date) return;
    if (form.eventType === 'action_item' && !form.projectId) {
      setError('A project is required for an Action Item.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(form)),
      });

      if (!res.ok) throw new Error();

      setAdding(false);
      setForm(emptyEventForm());
      router.refresh();
    } catch {
      setError('Could not save this event.');
    } finally {
      setSaving(false);
    }
  }

  function selectEvent(event) {
    setSelected(event);
    setEditForm(eventToForm(event));
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/calendar-events/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(editForm)),
      });

      if (!res.ok) throw new Error();

      setSelected(null);
      setEditForm(null);
      router.refresh();
    } catch {
      setError('Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm('Delete this event?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/calendar-events/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSelected(null);
      setEditForm(null);
      router.refresh();
    } catch {
      setError('Could not delete this event.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnectGoogle() {
    if (!confirm('Disconnect Google Calendar? Events already synced will stay on your Google Calendar, but new changes will stop syncing.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/admin/google-calendar/disconnect', { method: 'POST' });
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: 'var(--surface)',
          marginBottom: '1.5rem',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>
          <i className={`ti ${googleConnected ? 'ti-brand-google' : 'ti-brand-google'}`} style={{ marginRight: '0.5rem', color: googleConnected ? 'var(--text-success)' : 'var(--text-tertiary)' }} aria-hidden="true"></i>
          Google Calendar: <strong>{googleConnected ? 'Connected (two-way sync)' : 'Not connected'}</strong>
        </span>
        {googleConnected ? (
          <button type="button" onClick={handleDisconnectGoogle} disabled={disconnecting} className={adminStyles.cancelBtn}>
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <a href="/api/admin/google-calendar/connect" className="btn-navy" style={{ padding: '0.5rem 1.2rem', fontSize: '0.75rem' }}>
            Connect Google Calendar
          </a>
        )}
      </div>

      {googleStatus === 'connected' && (
        <p className={adminStyles.formMsgSuccess} style={{ marginBottom: '1rem' }}>Google Calendar connected.</p>
      )}
      {googleStatus === 'error' && (
        <p className={adminStyles.formMsgError} style={{ marginBottom: '1rem' }}>Could not connect Google Calendar. Please try again.</p>
      )}

      <CalendarView
        events={initialEvents}
        onSelectEvent={selectEvent}
        selectedEventId={selected?.id}
        headerActions={
          <button type="button" className="btn-navy" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }} onClick={() => { setAdding(true); setSelected(null); }}>
            <i className="ti ti-plus" aria-hidden="true"></i> Add Event
          </button>
        }
      />

      {adding && (
        <CalendarEventModal
          mode="add"
          form={form}
          onChange={setForm}
          projects={projects}
          people={people}
          contacts={contacts}
          onSave={handleAdd}
          onClose={() => { setAdding(false); setForm(emptyEventForm()); }}
          saving={saving}
          error={error}
        />
      )}

      {selected && editForm && (
        <CalendarEventModal
          mode="edit"
          form={editForm}
          onChange={setEditForm}
          projects={projects}
          people={people}
          contacts={contacts}
          onSave={saveEdit}
          onDelete={handleDelete}
          onClose={() => { setSelected(null); setEditForm(null); }}
          saving={saving}
          error={error}
          headerExtra={<AddToCalendarLink event={selected} />}
        />
      )}
    </div>
  );
}
