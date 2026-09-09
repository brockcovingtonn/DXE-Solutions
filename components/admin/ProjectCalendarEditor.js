'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import CalendarEventModal, { emptyEventForm, eventToForm, formToPayload } from '@/components/admin/CalendarEventModal';

export default function ProjectCalendarEditor({ projectId, initialEvents, people, contacts }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...emptyEventForm(), projectId });
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload({ ...form, projectId })),
      });

      if (!res.ok) throw new Error();

      setAdding(false);
      setForm({ ...emptyEventForm(), projectId });
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
      <CalendarView
        events={initialEvents}
        onSelectEvent={selectEvent}
        selectedEventId={selected?.id}
        headerActions={
          <button type="button" className="btn-navy" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }} onClick={() => { setAdding(true); setSelected(null); }}>
            <i className="ti ti-plus" aria-hidden="true"></i> Add to Calendar
          </button>
        }
      />

      {adding && (
        <CalendarEventModal
          mode="add"
          form={form}
          onChange={setForm}
          lockedProjectId={projectId}
          people={people}
          contacts={contacts}
          onSave={handleAdd}
          onClose={() => { setAdding(false); setForm({ ...emptyEventForm(), projectId }); }}
          saving={saving}
          error={error}
        />
      )}

      {selected && editForm && (
        <CalendarEventModal
          mode="edit"
          form={editForm}
          onChange={setEditForm}
          lockedProjectId={projectId}
          people={people}
          contacts={contacts}
          onSave={saveEdit}
          onDelete={handleDelete}
          onClose={() => { setSelected(null); setEditForm(null); }}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}
