-- ============================================================================
-- Design Studio — room scans: per-scan client visibility + project linking
-- Run once in the Supabase SQL Editor.
--
-- 1. show_to_client: every scan attached to a quote used to appear on the
--    public proposal unconditionally. That's now opt-in per scan, off by
--    default — staff review a scan (floor plan can come out messy) before
--    deciding it's client-presentable.
-- 2. project_id: a scan can also attach to a real DXE project (not just a
--    design-studio quote), so the LiDAR capture is useful to the wider team
--    working that project, not only whoever built the quote.
-- ============================================================================

alter table public.design_studio_room_scans
  add column if not exists show_to_client boolean not null default false,
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists design_studio_room_scans_project_idx on public.design_studio_room_scans (project_id);
