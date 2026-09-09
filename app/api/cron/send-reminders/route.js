import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendPushToUser } from '@/lib/push-notifications';

// Runs every minute via a Supabase pg_cron job (see
// calendar_reminders_migration.sql) — not Vercel cron, so it isn't
// bound by Vercel's plan-tier cron-frequency limits.
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  // Bounded lookback so a cron outage doesn't flood everyone with
  // reminders for long-past events once it comes back.
  const lookbackFloor = new Date(now - 2 * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await admin
    .from('calendar_events')
    .select('id, title, start_time, reminder_minutes, assigned_to, created_by, project_id')
    .not('reminder_minutes', 'is', null)
    .is('reminder_sent_at', null)
    .gt('start_time', lookbackFloor);

  let sent = 0;
  for (const event of candidates || []) {
    const reminderTime = new Date(event.start_time).getTime() - event.reminder_minutes * 60 * 1000;
    if (reminderTime > now) continue;

    const recipientId = event.assigned_to || event.created_by;
    if (recipientId) {
      try {
        await sendPushToUser(recipientId, {
          title: 'Reminder',
          body: event.title,
          data: { type: 'calendar_event', projectId: event.project_id || null, eventId: event.id },
        });
        sent += 1;
      } catch (err) {
        console.error('Failed to send calendar reminder for', event.id, err);
      }
    }

    await admin.from('calendar_events').update({ reminder_sent_at: new Date().toISOString() }).eq('id', event.id);
  }

  return NextResponse.json({ success: true, checked: candidates?.length || 0, sent });
}
