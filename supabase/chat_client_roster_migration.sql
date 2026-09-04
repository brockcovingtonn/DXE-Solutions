-- =====================================================================
-- DXE Solutions — Client Chat Roster Migration
-- Run this any time after chat_dm_migration.sql.
--
-- Clients now pick a specific project to chat about (a real group
-- thread with admin + any assigned employee, not just a DM), so the
-- chat widget's roster ("who's online" / read receipts) needs to
-- actually be able to see who else is in that thread. Neither of these
-- were ever granted: a client had no way to see an admin's profile, or
-- to see which employees (if any) are assigned to their own project.
-- Names only — nothing sensitive is exposed.
-- =====================================================================

create policy "Anyone signed in can view admin profiles"
  on public.profiles for select
  using (is_admin = true);

create policy "Clients can view employee assignments on their own projects"
  on public.project_employees for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Clients can view employee profiles on their own projects"
  on public.profiles for select
  using (
    id in (
      select employee_id from public.project_employees
      where project_id in (select id from public.projects where owner_id = auth.uid())
    )
  );
