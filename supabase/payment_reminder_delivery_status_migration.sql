-- =====================================================================
-- DXE Solutions — delivery status for payment-schedule reminder emails
--
-- The reminder/alert/scheduled-invoice email functions previously never
-- checked whether Resend actually delivered the email — a bad address,
-- rate limit, or outage would fail silently, and the reminder threshold
-- would still get marked "sent," so it would never retry. This surfaces
-- the real outcome directly on the row it's about, and (see the cron
-- route) makes a failed send retry on the next run instead of being
-- marked done.
--
-- last_notification_error is cleared on the next successful send, so a
-- non-null value always means "currently failing," not just "failed
-- once, historically."
-- =====================================================================

alter table public.payment_schedule_items
  add column if not exists last_notification_sent_at timestamptz,
  add column if not exists last_notification_error text,
  add column if not exists last_notification_error_at timestamptz;
