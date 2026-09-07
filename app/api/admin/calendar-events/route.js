import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { syncEventToGoogle } from '@/lib/google-calendar';
import { createCalendarEvent } from '@/lib/calendar-events';

async function requireAdmin(supabase, user) {
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

export async function POST(request) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { event, error, status } = await createCalendarEvent({ supabase, actorId: user.id, payload: body });

    if (error) {
      return NextResponse.json({ error }, { status: status || 400 });
    }

    try {
      const admin = createAdminClient();
      const googleEventId = await syncEventToGoogle(admin, user.id, event);
      if (googleEventId && googleEventId !== event.google_event_id) {
        await supabase.from('calendar_events').update({ google_event_id: googleEventId }).eq('id', event.id);
        event.google_event_id = googleEventId;
      }
    } catch (syncErr) {
      console.error('Google Calendar sync error:', syncErr);
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error('Create calendar event error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
