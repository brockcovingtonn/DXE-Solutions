import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { syncEventToGoogle, deleteEventFromGoogle, getSyncTargetUserId } from '@/lib/google-calendar';
import { syncEventGuestsAndContacts } from '@/lib/calendar-events';

// Employee-authored calendar events — edit/delete for events on projects
// they're assigned to (RLS enforces this). Mirrors
// /api/admin/calendar-events/[id] — including Google sync, which goes
// to the employee's own Google Calendar if they've connected one,
// otherwise falls back to whichever admin has one connected.
async function requireEmployee(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_employee')
    .eq('id', user.id)
    .single();

  if (!profile?.is_employee) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

const ALLOWED_FIELDS = ['title', 'description', 'start_time', 'end_time', 'all_day', 'visible_to_client', 'event_type', 'assigned_to', 'reminder_minutes'];

export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { user, error: authError } = await requireEmployee(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const update = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) update[key] = body[key];
    }
    if ('start_time' in update || 'reminder_minutes' in update) {
      update.reminder_sent_at = null;
    }

    const { data: event, error } = await supabase
      .from('calendar_events')
      .update(update)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    event.guests = await syncEventGuestsAndContacts(supabase, event.id, {
      guests: body.guests,
      contactIds: body.contactIds,
    });

    try {
      const admin = createAdminClient();
      const syncTargetId = await getSyncTargetUserId(admin, user.id);
      if (syncTargetId) {
        const googleEventId = await syncEventToGoogle(admin, syncTargetId, event);
        if (googleEventId && googleEventId !== event.google_event_id) {
          await supabase.from('calendar_events').update({ google_event_id: googleEventId }).eq('id', event.id);
        }
      }
    } catch (syncErr) {
      console.error('Google Calendar sync error:', syncErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update employee calendar event error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const supabase = createClient();
  const { user, error: authError } = await requireEmployee(supabase);
  if (authError) return authError;

  try {
    const { data: event } = await supabase
      .from('calendar_events')
      .select('google_event_id')
      .eq('id', params.id)
      .single();

    const { error } = await supabase.from('calendar_events').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (event?.google_event_id) {
      try {
        const admin = createAdminClient();
        const syncTargetId = await getSyncTargetUserId(admin, user.id);
        if (syncTargetId) {
          await deleteEventFromGoogle(admin, syncTargetId, event.google_event_id);
        }
      } catch (syncErr) {
        console.error('Google Calendar delete error:', syncErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete employee calendar event error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
