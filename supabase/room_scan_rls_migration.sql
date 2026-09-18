-- =====================================================================
-- First real RLS policies on design_studio_room_scans.
--
-- Previously RLS was enabled with zero policies — every read/write went
-- through supabaseAdmin() (service role) gated purely by an app-layer
-- requireStaff() check. Bringing this table in line with the standard
-- project-scoping convention used everywhere else (documents, photos,
-- notes, action_items, ...): admins see everything, employees see a
-- project's rows only if assigned via project_employees, and — new for
-- this table — clients can see their own project's scans, since clients
-- can now capture scans themselves (see room_scanner_toggle_migration.sql).
--
-- Deliberately no client INSERT policy: creation stays routed through
-- the Next.js API (minting signed storage upload URLs is inherently a
-- service-role operation), just now also callable by a client who owns
-- the project and has room_scanner_enabled — see lib/design-studio/server.js.
-- =====================================================================

drop policy if exists "Admins manage all room scans" on public.design_studio_room_scans;
create policy "Admins manage all room scans" on public.design_studio_room_scans
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Employees view assigned project room scans" on public.design_studio_room_scans;
create policy "Employees view assigned project room scans" on public.design_studio_room_scans
  for select using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

drop policy if exists "Clients view their own project room scans" on public.design_studio_room_scans;
create policy "Clients view their own project room scans" on public.design_studio_room_scans
  for select using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );
