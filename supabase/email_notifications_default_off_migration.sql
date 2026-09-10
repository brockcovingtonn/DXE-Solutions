-- =====================================================================
-- DXE Solutions — client update emails default OFF
--
-- The admin controls per-client whether that client receives the
-- "there's an update on your project" emails (new photos, documents,
-- notes, status changes) via a "Send Updates" toggle on the client
-- detail page. This flips the default and every existing row to OFF so
-- no client is emailed unless the admin explicitly opts them in.
-- =====================================================================

update public.profiles set email_notifications = false where email_notifications is distinct from false;

alter table public.profiles alter column email_notifications set default false;
