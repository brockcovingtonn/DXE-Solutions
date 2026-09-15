-- ============================================================================
-- Design Studio — room scans (LiDAR / RoomPlan)
-- Run once in the Supabase SQL Editor.
--
-- Captured natively (RoomPlan requires a LiDAR sensor — no web equivalent).
-- A scan can exist before a quote does (quote_id starts null, attached once
-- the quote is saved) or be captured against an existing draft directly.
--
-- Same security model as design_studio_quotes/config: RLS enabled, no
-- policies. Nothing reaches this table or its storage bucket except server
-- code using the service-role key, after requireStaff() has run. Reads
-- (staff pages, the public proposal page) always go through a short-lived
-- signed URL generated server-side — never a public bucket.
-- ============================================================================

create table if not exists public.design_studio_room_scans (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid references public.design_studio_quotes(id) on delete cascade,
  room_label      text,
  area_sqft       numeric,
  area_is_estimate boolean not null default false,
  wall_count      integer not null default 0,
  door_count      integer not null default 0,
  window_count    integer not null default 0,
  model_path      text not null,
  floor_plan_path text,
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index if not exists design_studio_room_scans_quote_idx on public.design_studio_room_scans (quote_id);

alter table public.design_studio_room_scans enable row level security;

insert into storage.buckets (id, name, public)
values ('design-studio-scans', 'design-studio-scans', false)
on conflict (id) do nothing;
-- No storage.objects policies, deliberately — service-role uploads/reads
-- (via signed URLs) bypass RLS entirely, matching the tables above.

-- ----------------------------------------------------------------------------
-- Rollback (keep for reference):
--   drop table if exists public.design_studio_room_scans;
--   delete from storage.buckets where id = 'design-studio-scans';
-- ----------------------------------------------------------------------------
