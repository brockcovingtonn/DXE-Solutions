-- ============================================================================
-- Persists every "Book a 15-min call" submission so staff can review them
-- later from Contacts, not just via the one-time admin notification email.
-- Run once in the Supabase SQL Editor.
-- ============================================================================

create table if not exists public.estimate_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  project_type text,
  details text,
  hear_about text,
  referral_name text,
  created_at timestamptz not null default now()
);

alter table public.estimate_requests enable row level security;
