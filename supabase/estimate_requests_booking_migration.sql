-- ============================================================================
-- Tracks a booked call against its originating estimate request, once the
-- public booking page (booking_availability) is used to actually pick a
-- slot on the connected Google Calendar.
-- Run once in the Supabase SQL Editor.
-- ============================================================================

alter table public.estimate_requests
  add column if not exists booked_start_time timestamptz,
  add column if not exists booked_end_time timestamptz,
  add column if not exists calendar_event_id uuid references public.calendar_events(id),
  add column if not exists google_event_id text;
