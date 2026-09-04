import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { syncEventToGoogle } from '@/lib/google-calendar';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
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
  const supabase = createClient();
  const { user, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, title, description, startTime, endTime, allDay, visibleToClient } = body;

    if (!title?.trim() || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
