'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import AddToCalendarLink from '@/components/AddToCalendarLink';
import GoogleCalendarConnection from '@/components/GoogleCalendarConnection';
import CalendarEventModal, { emptyEventForm, eventToForm, formToPayload } from '@/components/admin/CalendarEventModal';

export default function AdminCalendar({ initialEvents, projects, people, contacts, googleConnected, payments }) {
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyEventForm());
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div>
      <GoogleCalendarConnection googleConnected={googleConnected} />

      <CalendarView
        events={initialEvents}
        onSelectEvent={selectEvent}
        selectedEventId={selected?.id}
        payments={payments}
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
