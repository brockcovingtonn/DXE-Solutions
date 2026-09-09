import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { watchCalendar } from '@/lib/google-calendar';

// Google Calendar watch channels expire after at most ~7 days. This runs
// daily (see vercel.json) and renews any channel expiring within the
// next 2 days, so two-way sync never silently goes stale.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const { data: connections } = await admin
    .from('google_calendar_connections')
    .select('user_id')
    .or(`watch_expiration.is.null,watch_expiration.lt.${soon}`);

  let renewed = 0;
  for (const conn of connections || []) {
    try {
      await watchCalendar(admin, conn.user_id);
      renewed += 1;
    } catch (err) {
      console.error('Failed to renew Google Calendar watch for', conn.user_id, err);
    }
  }

  return NextResponse.json({ success: true, renewed });
}
