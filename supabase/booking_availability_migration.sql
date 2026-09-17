-- ============================================================================
-- Availability rules for the public "Book a 15-min call" booking page.
-- Single-row settings table (id is always `true`), same pattern as
-- site_settings. Actual open slots are computed live against whichever
-- admin connected their Google Calendar first (google_calendar_connections,
-- see getPrimaryConnectedAdminId in lib/google-calendar.js) — this table
-- only holds the rules, not the calendar connection itself.
-- Run once in the Supabase SQL Editor.
-- ============================================================================

create table if not exists public.booking_availability (
  id boolean primary key default true,
  session_minutes int not null default 15,
  buffer_minutes int not null default 10,
  min_notice_hours int not null default 4,
  max_days_out int not null default 14,
  timezone text not null default 'America/Los_Angeles',
  weekly_hours jsonb not null default '{"mon":[{"start":"09:00","end":"17:00"}],"tue":[{"start":"09:00","end":"17:00"}],"wed":[{"start":"09:00","end":"17:00"}],"thu":[{"start":"09:00","end":"17:00"}],"fri":[{"start":"09:00","end":"17:00"}],"sat":[],"sun":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint booking_availability_singleton check (id)
);

insert into public.booking_availability (id) values (true) on conflict (id) do nothing;

alter table public.booking_availability enable row level security;
