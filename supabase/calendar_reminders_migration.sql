-- =====================================================================
-- DXE Solutions — Calendar Reminders
-- Run any time after calendar_v2_migration.sql.
--
-- reminder_minutes: minutes before start_time to send a push
-- notification (0 = at the time of the event, null = no reminder).
-- reminder_sent_at: set once the reminder push has actually been sent,
-- so the cron below never double-sends.
--
-- Sending is driven by pg_cron + pg_net (both enabled below) calling
-- /api/cron/send-reminders every minute — this runs entirely inside
-- Supabase and doesn't depend on Vercel's cron scheduling limits.
-- =====================================================================

alter table public.calendar_events
  add column if not exists reminder_minutes int,
  add column if not exists reminder_sent_at timestamptz;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace-if-exists: safe to re-run this migration.
select cron.unschedule('send-calendar-reminders')
where exists (select 1 from cron.job where jobname = 'send-calendar-reminders');

-- Fill in your real site URL and CRON_SECRET (same value as the
-- CRON_SECRET env var) before running this — pg_cron has no access to
-- your app's environment variables, so these have to be hardcoded here.
select cron.schedule(
  'send-calendar-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://www.dxesolutions.com/api/cron/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET_HERE'),
    body := '{}'::jsonb
  );
  $$
);
