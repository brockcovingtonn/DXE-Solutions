import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { syncEventGuestsAndContacts } from '@/lib/calendar-events';

// Employee-authored calendar events — edit/delete for events on projects
// they're assigned to (RLS enforces this). Mirrors
// /api/admin/calendar-events/[id], minus the Google Calendar sync
// (that's tied to an admin's own connection, not an employee's).
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
  const { error: authError } = await requireEmployee(supabase);
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

    await syncEventGuestsAndContacts(supabase, event.id, {
      guests: body.guests,
      contactIds: body.contactIds,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update employee calendar event error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const supabase = createClient();
  const { error: authError } = await requireEmployee(supabase);
  if (authError) return authError;

  try {
    const { error } = await supabase.from('calendar_events').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete employee calendar event error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
