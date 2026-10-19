-- =====================================================================
-- DXE Solutions — Scope of Work Migration
-- Per-area checklists under Scope & Schedule. Each area (e.g. "Kitchen")
-- holds a list of scope items; checking an item off logs to the activity
-- feed and (unless manually overridden) recalculates the project's
-- overall progress_pct from the ratio of completed items.
-- =====================================================================

create table public.scope_areas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table public.scope_items (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.scope_areas(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade, -- denormalized for simple RLS/activity joins
  description text not null,
  completed boolean default false,
  completed_at timestamptz,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.projects add column if not exists progress_pct_auto boolean default true;

alter table public.scope_areas enable row level security;
alter table public.scope_items enable row level security;

-- Admins: full control over both tables
create policy "Admins can view all scope areas"
  on public.scope_areas for select
  using (public.is_admin());

create policy "Admins can insert scope areas"
  on public.scope_areas for insert
  with check (public.is_admin());

create policy "Admins can update scope areas"
  on public.scope_areas for update
  using (public.is_admin());

create policy "Admins can delete scope areas"
  on public.scope_areas for delete
  using (public.is_admin());

create policy "Admins can view all scope items"
  on public.scope_items for select
  using (public.is_admin());

create policy "Admins can insert scope items"
  on public.scope_items for insert
  with check (public.is_admin());

create policy "Admins can update scope items"
  on public.scope_items for update
  using (public.is_admin());

create policy "Admins can delete scope items"
  on public.scope_items for delete
  using (public.is_admin());

-- Employees: read-only via RLS, scoped to projects they're assigned to.
-- The completion toggle itself (PATCH /api/admin/scope-items/[id]) goes
-- through the service-role client with its own admin-or-assigned-employee
-- check in the route — same resolution used for room-scan access, since
-- "employee can flip completed but not rename/delete" isn't expressible
-- as a row-level policy.
create policy "Employees can view scope areas on assigned projects"
  on public.scope_areas for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can view scope items on assigned projects"
  on public.scope_items for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

-- No client-facing policy — Scope of Work is admin/employee only for now.
