'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import AddToCalendarLink from '@/components/AddToCalendarLink';
import adminStyles from '@/components/admin.module.css';

const EVENT_TYPES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'action_item', label: 'Action Item' },
  { value: 'other', label: 'Other' },
];

const emptyForm = {
  title: '',
  description: '',
  projectId: '',
  eventType: 'appointment',
  assignedTo: '',
  date: '',
  startTime: '',
  endTime: '',
  allDay: false,
  visibleToClient: false,
};

function toLocalDateTimeParts(isoString) {
  if (!isoString) return { date: '', time: '' };
  const d = new Date(isoString);
  const date = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const time = d.toTimeString().slice(0, 5); // HH:MM
  return { date, time };
}

function toIso(date, time) {
  if (!date) return null;
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

export default function AdminCalendar({ initialEvents, projects, people, googleConnected }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get('google');

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  function handleFormChange(setter) {
    return (e) => {
      const { name, value, type, checked } = e.target;
      setter((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
  }

  async function handleAdd(e) {
    e.preventDefault();
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
        body: JSON.stringify({
          projectId: form.projectId || null,
          title: form.title,
          description: form.description,
          eventType: form.eventType,
          assignedTo: form.assignedTo || null,
          startTime: toIso(form.date, form.allDay ? '00:00' : form.startTime),
          endTime: form.endTime ? toIso(form.date, form.endTime) : null,
          allDay: form.allDay,
          visibleToClient: form.visibleToClient,
        }),
      });

      if (!res.ok) throw new Error();

      setAdding(false);
      setForm(emptyForm);
      router.refresh();
    } catch {
      setError('Could not save this event.');
    } finally {
      setSaving(false);
    }
  }

  function selectEvent(event) {
    setSelected(event);
    const { date, time } = toLocalDateTimeParts(event.start_time);
    const endParts = toLocalDateTimeParts(event.end_time);
    setEditForm({
      title: event.title,
      description: event.description || '',
      projectId: event.project_id || '',
      eventType: event.event_type || 'appointment',
      assignedTo: event.assigned_to || '',
      date,
      startTime: time,
      endTime: endParts.time,
      allDay: event.all_day,
      visibleToClient: event.visible_to_client,
    });
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/calendar-events/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          project_id: editForm.projectId || null,
          event_type: editForm.eventType,
          assigned_to: editForm.assignedTo || null,
          start_time: toIso(editForm.date, editForm.allDay ? '00:00' : editForm.startTime),
          end_time: editForm.endTime ? toIso(editForm.date, editForm.endTime) : null,
          all_day: editForm.allDay,
          visible_to_client: editForm.visibleToClient,
        }),
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
          Google Calendar: <strong>{googleConnected ? 'Connected' : 'Not connected'}</strong>
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
        <div className={adminStyles.modalOverlay} onClick={() => { setAdding(false); setForm(emptyForm); }}>
          <div className={adminStyles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>New Event</h3>
            <EventFields form={form} onChange={handleFormChange(setForm)} projects={projects} people={people} />
            {error && <p className={adminStyles.formMsgError}>{error}</p>}
            <div className={adminStyles.entryFormActions}>
              <button type="button" className="btn-navy" onClick={handleAdd} disabled={saving || !form.title.trim() || !form.date}>
                {saving ? 'Saving...' : 'Add event'}
              </button>
              <button type="button" className={adminStyles.cancelBtn} onClick={() => { setAdding(false); setForm(emptyForm); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && editForm && (
        <div className={adminStyles.modalOverlay} onClick={() => { setSelected(null); setEditForm(null); }}>
          <div className={adminStyles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Edit Event</h3>
              <AddToCalendarLink event={selected} />
            </div>
            <EventFields form={editForm} onChange={handleFormChange(setEditForm)} projects={projects} people={people} />
            {error && <p className={adminStyles.formMsgError}>{error}</p>}
            <div className={adminStyles.entryFormActions} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-navy" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
                <button type="button" className={adminStyles.cancelBtn} onClick={() => { setSelected(null); setEditForm(null); }}>
                  Cancel
                </button>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                style={{ background: 'none', border: '1px solid var(--text-error)', color: 'var(--text-error)', padding: '0.6rem 1.2rem', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Delete event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventFields({ form, onChange, projects, people }) {
  return (
    <>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Title</label>
        <input className={adminStyles.fieldInput} name="title" value={form.title} onChange={onChange} placeholder="e.g. Framing inspection" />
      </div>
      <div className={adminStyles.formGrid3}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Type</label>
          <select className={adminStyles.fieldInput} name="eventType" value={form.eventType} onChange={onChange}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>
            Project {form.eventType === 'action_item' ? '(required for an Action Item)' : '(optional — leave blank for a general event)'}
          </label>
          <select className={adminStyles.fieldInput} name="projectId" value={form.projectId} onChange={onChange}>
            <option value="">General — no project</option>
            {(projects || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Assign to (optional)</label>
          <select className={adminStyles.fieldInput} name="assignedTo" value={form.assignedTo} onChange={onChange}>
            <option value="">Unassigned</option>
            {(people || []).map((p) => (
              <option key={p.id} value={p.id}>{`${p.first_name || ''} ${p.last_name || ''}`.trim()}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Description</label>
        <textarea className={adminStyles.fieldTextarea} name="description" value={form.description} onChange={onChange} />
      </div>
      <div className={adminStyles.formGrid3}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Date</label>
          <input className={adminStyles.fieldInput} type="date" name="date" value={form.date} onChange={onChange} />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Start time</label>
          <input className={adminStyles.fieldInput} type="time" name="startTime" value={form.startTime} onChange={onChange} disabled={form.allDay} />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>End time (optional)</label>
          <input className={adminStyles.fieldInput} type="time" name="endTime" value={form.endTime} onChange={onChange} disabled={form.allDay} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--navy)', cursor: 'pointer' }}>
          <input type="checkbox" name="allDay" checked={form.allDay} onChange={onChange} style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }} />
          All day
        </label>
        {form.projectId && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--navy)', cursor: 'pointer' }}>
            <input type="checkbox" name="visibleToClient" checked={form.visibleToClient} onChange={onChange} style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }} />
            Visible to client
          </label>
        )}
      </div>
    </>
  );
}
