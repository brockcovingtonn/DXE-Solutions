import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createCalendarEvent } from '@/lib/calendar-events';

// Employee-authored calendar events — always tied to a project they're
// assigned to (RLS enforces this on insert; general/no-project events
// stay admin-only). Mirrors /api/admin/calendar-events, minus the
// Google Calendar sync (that's tied to an admin's own connection).
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

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error('Create employee calendar event error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
