'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
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
  eventType: 'appointment',
  assignedTo: '',
  date: '',
  startTime: '',
  endTime: '',
  allDay: false,
  visibleToClient: false,
};

function toIso(date, time) {
  if (!date) return null;
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

export default function ProjectCalendarEditor({ projectId, initialEvents, people }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
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

  return (
    <div>
      <CalendarView
        events={initialEvents}
        onSelectEvent={() => {}}
        selectedEventId={null}
        headerActions={
          <button type="button" className="btn-navy" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }} onClick={() => setAdding(true)}>
            <i className="ti ti-plus" aria-hidden="true"></i> Add to Calendar
          </button>
        }
      />

      {adding && (
        <div className={adminStyles.utilityEntryForm} style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>New Calendar Item</h3>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Title</label>
            <input className={adminStyles.fieldInput} name="title" value={form.title} onChange={handleChange} placeholder="e.g. Framing inspection" />
          </div>
          <div className={adminStyles.formGrid3}>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Type</label>
              <select className={adminStyles.fieldInput} name="eventType" value={form.eventType} onChange={handleChange}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Assign to (optional)</label>
              <select className={adminStyles.fieldInput} name="assignedTo" value={form.assignedTo} onChange={handleChange}>
                <option value="">Unassigned</option>
                {(people || []).map((p) => (
                  <option key={p.id} value={p.id}>{`${p.first_name || ''} ${p.last_name || ''}`.trim()}</option>
                ))}
              </select>
            </div>
            <div className={adminStyles.fieldGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--navy)', cursor: 'pointer', marginTop: '1.6rem' }}>
                <input type="checkbox" name="visibleToClient" checked={form.visibleToClient} onChange={handleChange} style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }} />
                Visible to client
              </label>
            </div>
          </div>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Description</label>
            <textarea className={adminStyles.fieldTextarea} name="description" value={form.description} onChange={handleChange} />
          </div>
          <div className={adminStyles.formGrid3}>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Date</label>
              <input className={adminStyles.fieldInput} type="date" name="date" value={form.date} onChange={handleChange} />
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Start time</label>
              <input className={adminStyles.fieldInput} type="time" name="startTime" value={form.startTime} onChange={handleChange} disabled={form.allDay} />
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>End time (optional)</label>
              <input className={adminStyles.fieldInput} type="time" name="endTime" value={form.endTime} onChange={handleChange} disabled={form.allDay} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--navy)', cursor: 'pointer', marginBottom: '1rem' }}>
            <input type="checkbox" name="allDay" checked={form.allDay} onChange={handleChange} style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }} />
            All day
          </label>
          {error && <p className={adminStyles.formMsgError}>{error}</p>}
          <div className={adminStyles.entryFormActions}>
            <button type="button" className="btn-navy" onClick={handleAdd} disabled={saving || !form.title.trim() || !form.date}>
              {saving ? 'Saving...' : 'Add to calendar'}
            </button>
            <button type="button" className={adminStyles.cancelBtn} onClick={() => { setAdding(false); setForm(emptyForm); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
