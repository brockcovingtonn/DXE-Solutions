-- ============================================================================
-- Design Studio — manually uploaded floor plans
-- Run once in the Supabase SQL Editor.
--
-- Separate from design_studio_room_scans: a room scan is captured (LiDAR,
-- native only) and always has a 3D model; a floor plan here is just a file
-- staff already has — a PDF, image, or CAD drawing (DWG/DXF) — with no
-- capture step. PDF/image render inline; CAD files are stored and
-- downloadable but not rendered (no lightweight CAD renderer exists).
--
-- Same security model as the rest of Design Studio: RLS enabled, no
-- policies — service-role only, after requireStaff(). Reuses the
-- design-studio-scans bucket under a floor-plans/ prefix rather than
-- adding another bucket.
-- ============================================================================

create table if not exists public.design_studio_floor_plans (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid references public.design_studio_quotes(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  file_name       text not null,
  file_path       text not null,
  file_type       text not null check (file_type in ('pdf', 'image', 'cad', 'other')),
  is_renderable   boolean not null default false,
  show_to_client  boolean not null default false,
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index if not exists design_studio_floor_plans_quote_idx on public.design_studio_floor_plans (quote_id);
create index if not exists design_studio_floor_plans_project_idx on public.design_studio_floor_plans (project_id);

alter table public.design_studio_floor_plans enable row level security;
