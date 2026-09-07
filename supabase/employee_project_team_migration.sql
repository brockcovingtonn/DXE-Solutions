-- =====================================================================
-- DXE Solutions — Employee Project Team Access
-- Run this any time after employee_role_migration.sql.
--
-- project_team has always had select policies for admins and the owning
-- client, but never for assigned employees — so the Cover Sheet page
-- (staff-only, canAccessAsStaff) has been silently showing "No team
-- members on file" for any employee viewing it, even when a team is on
-- file, since RLS blocked the project_team query for that role. Same
-- pattern as "Employees can view phases of assigned projects" in
-- employee_role_migration.sql.
-- =====================================================================

create policy "Employees can view team on assigned projects"
  on public.project_team for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );
