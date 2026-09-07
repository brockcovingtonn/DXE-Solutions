-- =====================================================================
-- DXE Solutions — Client & Employee Contacts Access
-- Run this any time after contacts_migration.sql and employee_role_migration.sql.
--
-- contacts/project_contacts have only ever had an admin "for all" policy
-- — clients and employees had no way to see contacts linked to their own
-- project(s), even read-only. Adds scoped select policies so a client
-- sees contacts linked to a project they own, and an employee sees
-- contacts linked to a project they're assigned to.
-- =====================================================================

create policy "Clients can view contacts linked to their projects"
  on public.contacts for select
  using (
    id in (
      select contact_id from public.project_contacts
      where project_id in (select id from public.projects where owner_id = auth.uid())
    )
  );

create policy "Clients can view project_contacts on their projects"
  on public.project_contacts for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Employees can view contacts linked to assigned projects"
  on public.contacts for select
  using (
    id in (
      select contact_id from public.project_contacts
      where project_id in (select project_id from public.project_employees where employee_id = auth.uid())
    )
  );

create policy "Employees can view project_contacts on assigned projects"
  on public.project_contacts for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );
