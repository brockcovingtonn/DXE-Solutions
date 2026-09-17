-- ============================================================================
-- Site-wide feature toggles for the public marketing site.
-- Run once in the Supabase SQL Editor.
--
-- Single-row settings table (id is always `true`) — small enough not to
-- need per-key rows. google_booking_enabled controls whether the "Book a
-- 15-min call" form shows the Google Calendar scheduling widget after
-- someone submits it (the widget itself is unaffected — it's controlled
-- by NEXT_PUBLIC_GOOGLE_BOOKING_URL — this just toggles whether it's used).
-- ============================================================================

create table if not exists public.site_settings (
  id boolean primary key default true,
  google_booking_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id)
);

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

alter table public.site_settings enable row level security;
