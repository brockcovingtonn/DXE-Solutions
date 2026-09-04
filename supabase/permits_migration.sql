-- =====================================================================
-- DXE Solutions — Permits Migration
-- Run this any time after employee_role_migration.sql. Replaces the
-- single projects.permit_number text field with full multi-permit
-- tracking (a project can have any number of permits, each with its
-- own type, agency, status, and dates).
--
-- Note: this does NOT drop projects.permit_number — that column is left
-- in place (unused by the app going forward) so no existing data is lost.
-- =====================================================================

create table public.permits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  permit_type text not null,
  permit_number text,
  agency text,
  status text not null default 'not_started', -- not_started | submitted | in_plan_check | corrections | approved | issued | finaled
  submitted_date date,
  issued_date date,
  expiration_date date,
  notes text, -- internal notes — admin/employee only, never returned to clients
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.permits enable row level security;

-- Admins: full control
create policy "Admins can view all permits"
  on public.permits for select
  using (public.is_admin());

create policy "Admins can insert permits"
  on public.permits for insert
  with check (public.is_admin());

create policy "Admins can update permits"
  on public.permits for update
  using (public.is_admin());

create policy "Admins can delete permits"
  on public.permits for delete
  using (public.is_admin());

-- Employees: read-only, scoped to projects they're assigned to
create policy "Employees can view permits on assigned projects"
  on public.permits for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

-- Clients: no direct table access — they go through the function below,
-- which excludes the internal `notes` field entirely.
create or replace function public.get_project_permits(p_project_id uuid)
returns table (
  id uuid,
  project_id uuid,
  permit_type text,
  permit_number text,
  agency text,
  status text,
  submitted_date date,
  issued_date date,
  expiration_date date
) as $$
  select
    p.id, p.project_id, p.permit_type, p.permit_number, p.agency,
    p.status, p.submitted_date, p.issued_date, p.expiration_date
  from public.permits p
  where p.project_id = p_project_id
    and (
      public.is_admin()
      or p.project_id in (select id from public.projects where owner_id = auth.uid())
    )
  order by p.sort_order;
$$ language sql security definer stable;
