import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { pullChangesFromGoogle } from '@/lib/google-calendar';

// Google Calendar push notification receiver. Google POSTs here with no
// body — just headers identifying the channel and a resource state
// ('sync' on initial channel creation, 'exists' on an actual change).
// We verify the channel token we generated in watchCalendar(), then pull
// the actual diff via the stored incremental sync token.
export async function POST(request) {
  const channelId = request.headers.get('x-goog-channel-id');
  const resourceState = request.headers.get('x-goog-resource-state');
  const token = request.headers.get('x-goog-channel-token');

  if (!channelId || !token) {
    return NextResponse.json({ error: 'Missing channel headers' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from('google_calendar_connections')
    .select('user_id, watch_token')
    .eq('watch_channel_id', channelId)
    .maybeSingle();

  if (!conn || conn.watch_token !== token) {
    return NextResponse.json({ error: 'Unknown or invalid channel' }, { status: 404 });
  }

  // 'sync' fires once when the channel is first created — nothing to do yet.
  if (resourceState === 'exists') {
    try {
      await pullChangesFromGoogle(admin, conn.user_id);
    } catch (err) {
      console.error('Google Calendar webhook pull error:', err);
    }
  }

  return NextResponse.json({ success: true });
}
