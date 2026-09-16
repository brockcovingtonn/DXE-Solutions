-- ============================================================================
-- Design Studio — per-element measurements + annotated PDF export
-- Run once in the Supabase SQL Editor.
--
-- elements: one entry per detected wall/door/window with its captured
-- length/height (in feet), editable in the native "Annotate" flow when
-- walking a project and correcting a measurement against a tape. Existing
-- scans just have an empty array — nothing to backfill, the geometry to
-- populate this only exists at capture time.
--
-- annotated_pdf_path: the floor plan + hand-drawn markup (PencilKit),
-- flattened to a PDF, alongside a measurements page. Nullable — only set
-- once a scan has actually been annotated.
-- ============================================================================

alter table public.design_studio_room_scans
  add column if not exists elements jsonb not null default '[]'::jsonb,
  add column if not exists annotated_pdf_path text;
