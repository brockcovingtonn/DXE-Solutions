-- ============================================================================
-- Design Studio — room scans: add a web-renderable 3D model alongside the USDZ
-- Run once in the Supabase SQL Editor.
--
-- USDZ only renders inline in iOS Safari (native AR Quick Look); every other
-- browser just downloads it. model_gltf_path holds a simplified glTF/GLB
-- (box-mesh) export of the same capture, generated natively alongside the
-- USDZ, so the web app can embed a real in-browser 3D viewer. The USDZ stays
-- around for the AR handoff on supported devices.
-- ============================================================================

alter table public.design_studio_room_scans
  add column if not exists model_gltf_path text;
