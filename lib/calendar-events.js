import { sendPushToUser } from '@/lib/push-notifications';

export const EVENT_TYPES = ['action_item', 'appointment', 'inspection', 'meeting', 'deadline', 'other'];

// Replaces all guests/contact-tags for an event with the provided lists.
// `guests` is [{ email, name }], `contactIds` is [uuid]. Returns the
// guest rows (with email/name) so the caller can hand them to
// syncEventToGoogle as real attendees.
export async function syncEventGuestsAndContacts(supabase, eventId, { guests, contactIds }) {
  if (Array.isArray(guests)) {
    await supabase.from('calendar_event_guests').delete().eq('calendar_event_id', eventId);
    const rows = guests.filter((g) => g.email?.trim());
    if (rows.length > 0) {
      await supabase.from('calendar_event_guests').insert(
        rows.map((g) => ({ calendar_event_id: eventId, email: g.email.trim(), name: g.name || null }))
      );
    }
  }

  if (Array.isArray(contactIds)) {
    await supabase.from('calendar_event_contacts').delete().eq('calendar_event_id', eventId);
    if (contactIds.length > 0) {
      await supabase.from('calendar_event_contacts').insert(
        contactIds.map((contactId) => ({ calendar_event_id: eventId, contact_id: contactId }))
      );
    }
  }

  const { data: currentGuests } = await supabase
    .from('calendar_event_guests')
    .select('email, name')
    .eq('calendar_event_id', eventId);

  return currentGuests || [];
}

// Shared by the admin- and employee-authored calendar-event routes.
// Picking the "action_item" type also inserts a real row in
// action_items (same project/title/description/assignee/due date) so
// it shows up in the existing Action Items tracking too, not just on
// the calendar.
export async function createCalendarEvent({ supabase, actorId, payload }) {
  const {
    projectId,
    title,
    description,
    startTime,
    endTime,
    allDay,
    visibleToClient,
    eventType,
    assignedTo,
    guests,
    contactIds,
  } = payload;

  if (!title?.trim() || !startTime) {
    return { error: 'Missing required fields', status: 400 };
  }

  const type = EVENT_TYPES.includes(eventType) ? eventType : 'appointment';

  if (type === 'action_item' && !projectId) {
    return { error: 'A project is required for an Action Item', status: 400 };
  }

  let linkedActionItemId = null;
  if (type === 'action_item') {
    const { data: actionItem, error: actionItemError } = await supabase
      .from('action_items')
      .insert({
        project_id: projectId,
        title: title.trim(),
        description: description || null,
        assigned_to: assignedTo || null,
        visible_to_client: !!visibleToClient,
        due_date: startTime.slice(0, 10),
        created_by: actorId,
      })
      .select()
      .single();

    if (actionItemError) {
      return { error: actionItemError.message, status: 400 };
    }
    linkedActionItemId = actionItem.id;
  }

  const { data: event, error } = await supabase
    .from('calendar_events')
    .insert({
      project_id: projectId || null,
      title: title.trim(),
      description: description || null,
      start_time: startTime,
      end_time: endTime || null,
      all_day: !!allDay,
      visible_to_client: !!visibleToClient,
      event_type: type,
      assigned_to: assignedTo || null,
      linked_action_item_id: linkedActionItemId,
      created_by: actorId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message, status: 400 };
  }

  event.guests = await syncEventGuestsAndContacts(supabase, event.id, { guests, contactIds });

  if (assignedTo && assignedTo !== actorId) {
    try {
      await sendPushToUser(assignedTo, {
        title: 'New Calendar Item',
        body: title.trim(),
        data: { type: 'calendar_event', projectId: projectId || null },
      });
    } catch (pushErr) {
      console.error('Push notification error (calendar event):', pushErr);
    }
  }

  return { event };
}
