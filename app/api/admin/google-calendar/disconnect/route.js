import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { stopWatchingCalendar } from '@/lib/google-calendar';

export async function POST(request) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_employee')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_employee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  await stopWatchingCalendar(admin, user.id);
  const { error } = await admin.from('google_calendar_connections').delete().eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
