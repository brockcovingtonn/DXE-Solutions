import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { syncEventToGoogle, getPrimaryConnectedAdminId } from '@/lib/google-calendar';
import { createCalendarEvent } from '@/lib/calendar-events';

// Employee-authored calendar events — always tied to a project they're
// assigned to (RLS enforces this on insert; general/no-project events
// stay admin-only). Employees don't get their own Google Calendar
// connection, so these sync to whichever admin has one connected —
// same shared business calendar an admin-created event would land on.
export async function POST(request) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_employee')
    .eq('id', user.id)
    .single();

  if (!profile?.is_employee) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body.projectId) {
      return NextResponse.json({ error: 'A project is required' }, { status: 400 });
    }

    const { event, error, status } = await createCalendarEvent({ supabase, actorId: user.id, payload: body });

    if (error) {
      return NextResponse.json({ error }, { status: status || 400 });
    }

    try {
      const admin = createAdminClient();
      const connectedAdminId = await getPrimaryConnectedAdminId(admin);
      if (connectedAdminId) {
        const googleEventId = await syncEventToGoogle(admin, connectedAdminId, event);
        if (googleEventId && googleEventId !== event.google_event_id) {
          await supabase.from('calendar_events').update({ google_event_id: googleEventId }).eq('id', event.id);
          event.google_event_id = googleEventId;
        }
      }
    } catch (syncErr) {
      console.error('Google Calendar sync error:', syncErr);
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error('Create employee calendar event error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
