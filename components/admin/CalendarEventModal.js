'use client';

import { useState } from 'react';
import adminStyles from '@/components/admin.module.css';

export const EVENT_TYPES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'action_item', label: 'Action Item' },
  { value: 'other', label: 'Other' },
];

export const REMINDER_OPTIONS = [
  { value: '', label: 'No reminder' },
  { value: '0', label: 'At time of event' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
];

export function emptyEventForm() {
  return {
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
    reminderMinutes: '',
    contactIds: [],
    guests: [],
  };
}

export function eventToForm(event) {
  const start = new Date(event.start_time);
  const date = start.toLocaleDateString('en-CA');
  const startTime = event.all_day ? '' : start.toTimeString().slice(0, 5);
  const endTime = event.end_time && !event.all_day ? new Date(event.end_time).toTimeString().slice(0, 5) : '';

  return {
    title: event.title,
    description: event.description || '',
    projectId: event.project_id || '',
    eventType: event.event_type || 'appointment',
    assignedTo: event.assigned_to || '',
    date,
    startTime,
    endTime,
    allDay: event.all_day,
    visibleToClient: event.visible_to_client,
    reminderMinutes: event.reminder_minutes == null ? '' : String(event.reminder_minutes),
    contactIds: (event.calendar_event_contacts || []).map((c) => c.contact_id),
    guests: (event.calendar_event_guests || []).map((g) => ({ email: g.email, name: g.name || '' })),
  };
}

function toIso(date, time) {
  if (!date) return null;
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

export function formToPayload(form) {
  return {
    title: form.title,
    description: form.description,
    project_id: form.projectId || null,
    projectId: form.projectId || null,
    event_type: form.eventType,
    eventType: form.eventType,
    assigned_to: form.assignedTo || null,
    assignedTo: form.assignedTo || null,
    start_time: toIso(form.date, form.allDay ? '00:00' : form.startTime),
    startTime: toIso(form.date, form.allDay ? '00:00' : form.startTime),
    end_time: form.endTime ? toIso(form.date, form.endTime) : null,
    endTime: form.endTime ? toIso(form.date, form.endTime) : null,
    all_day: form.allDay,
    allDay: form.allDay,
    visible_to_client: form.visibleToClient,
    visibleToClient: form.visibleToClient,
    reminder_minutes: form.reminderMinutes === '' ? null : Number(form.reminderMinutes),
    reminderMinutes: form.reminderMinutes === '' ? null : Number(form.reminderMinutes),
    contactIds: form.contactIds,
    guests: form.guests,
  };
}

// Shared add/edit calendar event popup. Used by both the firm-wide
// admin calendar and a single project's calendar tab — pass
// `lockedProjectId` (and omit `projects`) to hide the project picker
// when already scoped to one project.
export default function CalendarEventModal({
  mode,
  form,
  onChange,
  projects,
  lockedProjectId,
  people,
  contacts,
  onSave,
  onDelete,
  onClose,
  saving,
  error,
  headerExtra,
}) {
  const [addingContact, setAddingContact] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');

  function update(field, value) {
    onChange({ ...form, [field]: value });
  }

  function handleField(e) {
    const { name, value, type, checked } = e.target;
    update(name, type === 'checkbox' ? checked : value);
  }

  const taggedContacts = (contacts || []).filter((c) => form.contactIds.includes(c.id));
  const availableContacts = (contacts || []).filter((c) => !form.contactIds.includes(c.id));

  function addContact() {
    if (!addingContact) return;
    update('contactIds', [...form.contactIds, addingContact]);
    setAddingContact('');
  }

  function removeContact(id) {
    update('contactIds', form.contactIds.filter((c) => c !== id));
  }

  function addGuest() {
    if (!guestEmail.trim()) return;
    update('guests', [...form.guests, { email: guestEmail.trim(), name: guestName.trim() }]);
    setGuestEmail('');
    setGuestName('');
  }

  function removeGuest(email) {
    update('guests', form.guests.filter((g) => g.email !== email));
  }

  return (
    <div className={adminStyles.modalOverlay} onClick={onClose}>
      <div className={adminStyles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{mode === 'add' ? 'New Calendar Item' : 'Edit Calendar Item'}</h3>
          {headerExtra}
        </div>

        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Title</label>
          <input className={adminStyles.fieldInput} name="title" value={form.title} onChange={handleField} placeholder="e.g. Framing inspection" />
        </div>

        <div className={adminStyles.formGrid3}>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Type</label>
            <select className={adminStyles.fieldInput} name="eventType" value={form.eventType} onChange={handleField}>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {projects && (
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>
                Project {form.eventType === 'action_item' ? '(required for an Action Item)' : '(optional)'}
              </label>
              <select className={adminStyles.fieldInput} name="projectId" value={form.projectId} onChange={handleField}>
                <option value="">General — no project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Assign to (optional)</label>
            <select className={adminStyles.fieldInput} name="assignedTo" value={form.assignedTo} onChange={handleField}>
              <option value="">Unassigned</option>
              {(people || []).map((p) => (
                <option key={p.id} value={p.id}>{`${p.first_name || ''} ${p.last_name || ''}`.trim()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Description</label>
          <textarea className={adminStyles.fieldTextarea} name="description" value={form.description} onChange={handleField} />
        </div>

        <div className={adminStyles.formGrid3}>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Date</label>
            <input className={adminStyles.fieldInput} type="date" name="date" value={form.date} onChange={handleField} />
          </div>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Start time</label>
            <input className={adminStyles.fieldInput} type="time" name="startTime" value={form.startTime} onChange={handleField} disabled={form.allDay} />
          </div>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>End time (optional)</label>
            <input className={adminStyles.fieldInput} type="time" name="endTime" value={form.endTime} onChange={handleField} disabled={form.allDay} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--navy)', cursor: 'pointer' }}>
            <input type="checkbox" name="allDay" checked={form.allDay} onChange={handleField} style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }} />
            All day
          </label>
          {(form.projectId || lockedProjectId) && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--navy)', cursor: 'pointer' }}>
              <input type="checkbox" name="visibleToClient" checked={form.visibleToClient} onChange={handleField} style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }} />
              Visible to client
            </label>
          )}
        </div>

        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Reminder</label>
          <select className={adminStyles.fieldInput} name="reminderMinutes" value={form.reminderMinutes} onChange={handleField}>
            {REMINDER_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Tagged contacts</label>
          {taggedContacts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {taggedContacts.map((c) => <TaggedContact key={c.id} contact={c} onRemove={() => removeContact(c.id)} />)}
            </div>
          )}
          {availableContacts.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select className={adminStyles.fieldInput} value={addingContact} onChange={(e) => setAddingContact(e.target.value)}>
                <option value="">Select a contact...</option>
                {availableContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.trade ? ` — ${c.trade}` : ''}</option>
                ))}
              </select>
              <button type="button" className={adminStyles.cancelBtn} onClick={addContact}>Tag</button>
            </div>
          )}
        </div>

        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Guests (invited via Google Calendar)</label>
          {form.guests.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
              {form.guests.map((g) => (
                <div key={g.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--navy)' }}>
                  <span>{g.name ? `${g.name} — ` : ''}{g.email}</span>
                  <button type="button" className={adminStyles.iconBtn} onClick={() => removeGuest(g.email)} aria-label="Remove guest">
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className={adminStyles.fieldInput} placeholder="Name (optional)" value={guestName} onChange={(e) => setGuestName(e.target.value)} style={{ flex: '0 0 40%' }} />
            <input className={adminStyles.fieldInput} placeholder="Email" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            <button type="button" className={adminStyles.cancelBtn} onClick={addGuest}>Add</button>
          </div>
        </div>

        {error && <p className={adminStyles.formMsgError}>{error}</p>}

        <div className={adminStyles.entryFormActions} style={{ justifyContent: onDelete ? 'space-between' : 'flex-start' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn-navy" onClick={onSave} disabled={saving || !form.title.trim() || !form.date}>
              {saving ? 'Saving...' : mode === 'add' ? 'Add event' : 'Save changes'}
            </button>
            <button type="button" className={adminStyles.cancelBtn} onClick={onClose}>Cancel</button>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              style={{ background: 'none', border: '1px solid var(--text-error)', color: 'var(--text-error)', padding: '0.6rem 1.2rem', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Delete event
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TaggedContact({ contact, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ border: '1px solid rgba(var(--border-rgb), 0.14)', padding: '0.4rem 0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--navy)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left' }}
        >
          {contact.name}{contact.trade ? ` — ${contact.trade}` : ''}
        </button>
        <button type="button" className={adminStyles.iconBtn} onClick={onRemove} aria-label="Remove tagged contact">
          <i className="ti ti-trash" aria-hidden="true"></i>
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {contact.company && <div>{contact.company}</div>}
          {contact.phone && <div><i className="ti ti-phone" aria-hidden="true"></i> {contact.phone}</div>}
          {contact.email && <div><i className="ti ti-mail" aria-hidden="true"></i> {contact.email}</div>}
          {contact.website && <div><i className="ti ti-world" aria-hidden="true"></i> {contact.website}</div>}
          {!contact.phone && !contact.email && !contact.website && <div>No contact details on file.</div>}
        </div>
      )}
    </div>
  );
}
