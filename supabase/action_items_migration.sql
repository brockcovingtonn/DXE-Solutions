-- =====================================================================
-- DXE Solutions — Action Items Migration
-- Run this AFTER employee_role_migration.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Action items — the task-tracking layer under each project. Admins
-- create and assign them; employees can mark their own assigned items
-- done; clients only ever see the ones explicitly flagged visible to
-- them.
-- ---------------------------------------------------------------------
create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open', -- open | done
  assigned_to uuid references public.profiles(id) on delete set null,
  visible_to_client boolean not null default false,
  due_date date,
  sort_order int default 0,
  created_by uuid references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.action_items enable row level security;

-- Admins: full control
create policy "Admins can view all action items"
  on public.action_items for select
  using (public.is_admin());

create policy "Admins can insert action items"
  on public.action_items for insert
  with check (public.is_admin());

create policy "Admins can update action items"
  on public.action_items for update
  using (public.is_admin());

create policy "Admins can delete action items"
  on public.action_items for delete
  using (public.is_admin());

-- Employees: can view and update (e.g. mark complete) items on projects
-- they're assigned to. No insert/delete — those stay admin-only.
create policy "Employees can view action items on assigned projects"
  on public.action_items for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can update action items on assigned projects"
  on public.action_items for update
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

-- Clients: read-only, and only items explicitly marked visible to them,
-- on projects they own.
create policy "Clients can view visible action items on their projects"
  on public.action_items for select
  using (
    visible_to_client = true
    and project_id in (select id from public.projects where owner_id = auth.uid())
  );
