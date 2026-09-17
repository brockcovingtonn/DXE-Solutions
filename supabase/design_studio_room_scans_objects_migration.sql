-- ============================================================================
-- Design Studio — detected furniture/fixtures per scan (groundwork for a
-- future floor-plan editor + asset library; not surfaced in any editing UI
-- yet, just persisted instead of discarded).
-- Run once in the Supabase SQL Editor.
--
-- `elements` (walls/doors/windows) already gained start_x/start_z/end_x/
-- end_z keys — no migration needed there, it's a jsonb column, and the
-- native app just started writing more keys into the same shape.
-- ============================================================================

alter table public.design_studio_room_scans
  add column if not exists objects jsonb not null default '[]'::jsonb;
