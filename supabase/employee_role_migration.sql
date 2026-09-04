-- =====================================================================
-- DXE Solutions — Employee Role Migration
-- Run this AFTER schema.sql and admin_migration.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Add an is_employee flag to profiles
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_employee boolean default false;

-- ---------------------------------------------------------------------
-- 2. Helper function: check if the current user is an employee
-- Defined as SECURITY DEFINER so it can read profiles without
-- recursively triggering RLS on profiles itself.
-- ---------------------------------------------------------------------
create or replace function public.is_employee()
returns boolean as $$
  select coalesce(
    (select is_employee from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer stable;

-- ---------------------------------------------------------------------
-- 3. Project assignments — which employees are staffed on which projects.
-- Employees only see projects they're assigned to here, not every project.
-- ---------------------------------------------------------------------
create table public.project_employees (
  project_id uuid references public.projects(id) on delete cascade,
  employee_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (project_id, employee_id)
);

alter table public.project_employees enable row level security;

create policy "Admins can view all project assignments"
  on public.project_employees for select
  using (public.is_admin());

create policy "Admins can insert project assignments"
  on public.project_employees for insert
  with check (public.is_admin());

create policy "Admins can delete project assignments"
  on public.project_employees for delete
  using (public.is_admin());

create policy "Employees can view their own assignments"
  on public.project_employees for select
  using (employee_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. Employees get read-only access to projects they're assigned to
-- (and everything hanging off those projects). No insert/update/delete
-- policies for employees yet — that comes with later features (action
-- items, cover sheets, etc.) that actually need to write.
-- ---------------------------------------------------------------------
create policy "Employees can view their assigned projects"
  on public.projects for select
  using (
    id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can view phases of assigned projects"
  on public.project_phases for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can view milestones of assigned projects"
  on public.milestones for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can view documents of assigned projects"
  on public.documents for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can view photos of assigned projects"
  on public.photos for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can view notes of assigned projects"
  on public.notes for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can view activity of assigned projects"
  on public.activity for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 5. Employees can view the client profile that owns a project they're
-- assigned to (so their dashboard can show the client's name).
-- ---------------------------------------------------------------------
create policy "Employees can view clients on their assigned projects"
  on public.profiles for select
  using (
    id in (
      select owner_id from public.projects
      where id in (select project_id from public.project_employees where employee_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- 6. Storage — employees can read (not upload) files for assigned projects
-- ---------------------------------------------------------------------
create policy "Employees can read documents of assigned projects"
  on storage.objects for select
  using (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1]::uuid in (
      select project_id from public.project_employees where employee_id = auth.uid()
    )
  );

create policy "Employees can read photos of assigned projects"
  on storage.objects for select
  using (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1]::uuid in (
      select project_id from public.project_employees where employee_id = auth.uid()
    )
  );
