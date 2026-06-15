-- =====================================================================
-- DXE Solutions — Feature Migration: Project Team, Utilities, Notes
-- Run this AFTER schema.sql and admin_migration.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Drop columns no longer needed on projects (estimated_value, pm_name)
-- ---------------------------------------------------------------------
alter table public.projects drop column if exists estimated_value;
alter table public.projects drop column if exists pm_name;

-- ---------------------------------------------------------------------
-- 2. Add notes column to milestones
-- ---------------------------------------------------------------------
alter table public.milestones
  add column if not exists notes text;

-- ---------------------------------------------------------------------
-- 3. PROJECT TEAM
-- People assigned to a project: trade/title, name, phone, email
-- ---------------------------------------------------------------------
create table public.project_team (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  trade text not null,
  name text,
  phone text,
  email text,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.project_team enable row level security;

create policy "Clients can view team for their own projects"
  on public.project_team for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Admins can view all project team"
  on public.project_team for select
  using (public.is_admin());

create policy "Admins can insert project team"
  on public.project_team for insert
  with check (public.is_admin());

create policy "Admins can update project team"
  on public.project_team for update
  using (public.is_admin());

create policy "Admins can delete project team"
  on public.project_team for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. UTILITIES
-- One row per utility type (electrical, water, gas) per project,
-- holding the contact info. Entries (application/status/etc) are
-- stored separately in project_utility_entries (one-to-many).
-- ---------------------------------------------------------------------
create table public.project_utilities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  utility_type text not null, -- 'electrical' | 'water' | 'gas'
  enabled boolean default false,
  contact_trade text,
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_comments text, -- admin-only
  created_at timestamptz default now(),
  unique(project_id, utility_type)
);

alter table public.project_utilities enable row level security;

create policy "Admins can view all utilities"
  on public.project_utilities for select
  using (public.is_admin());

create policy "Admins can insert utilities"
  on public.project_utilities for insert
  with check (public.is_admin());

create policy "Admins can update utilities"
  on public.project_utilities for update
  using (public.is_admin());

create policy "Admins can delete utilities"
  on public.project_utilities for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 4b. UTILITY ENTRIES
-- Multiple tracking entries per utility (application/work request/status).
-- action_step and comments are admin-only.
-- ---------------------------------------------------------------------
create table public.project_utility_entries (
  id uuid primary key default gen_random_uuid(),
  utility_id uuid references public.project_utilities(id) on delete cascade,
  application text,
  work_request_number text,
  status text default 'not_ready', -- in_progress | pending | complete | not_ready
  action_step text,    -- admin-only
  comments text,       -- admin-only
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.project_utility_entries enable row level security;

create policy "Admins can view all utility entries"
  on public.project_utility_entries for select
  using (public.is_admin());

create policy "Admins can insert utility entries"
  on public.project_utility_entries for insert
  with check (public.is_admin());

create policy "Admins can update utility entries"
  on public.project_utility_entries for update
  using (public.is_admin());

create policy "Admins can delete utility entries"
  on public.project_utility_entries for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 4c. Client-safe access function
-- Returns utilities + their entries, excluding admin-only fields
-- (action_step, comments, contact_comments)
-- ---------------------------------------------------------------------
create or replace function public.get_project_utilities(p_project_id uuid)
returns table (
  id uuid,
  project_id uuid,
  utility_type text,
  enabled boolean,
  contact_trade text,
  contact_name text,
  contact_phone text,
  contact_email text,
  entries jsonb
) as $$
  select
    u.id, u.project_id, u.utility_type, u.enabled,
    u.contact_trade, u.contact_name, u.contact_phone, u.contact_email,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'application', e.application,
            'work_request_number', e.work_request_number,
            'status', e.status
          )
          order by e.sort_order
        )
        from public.project_utility_entries e
        where e.utility_id = u.id
      ),
      '[]'::jsonb
    ) as entries
  from public.project_utilities u
  where u.project_id = p_project_id
    and (
      public.is_admin()
      or u.project_id in (select id from public.projects where owner_id = auth.uid())
    );
$$ language sql security definer stable;

-- ---------------------------------------------------------------------
-- 5. Seed default utility rows for existing projects (one per type)
-- so the admin UI has rows to edit immediately.
-- ---------------------------------------------------------------------
insert into public.project_utilities (project_id, utility_type, enabled)
select p.id, t.utility_type, false
from public.projects p
cross join (values ('electrical'), ('water'), ('gas')) as t(utility_type)
on conflict (project_id, utility_type) do nothing;

-- ---------------------------------------------------------------------
-- 6. Trigger: auto-create utility rows for new projects
-- ---------------------------------------------------------------------
create or replace function public.handle_new_project()
returns trigger as $$
begin
  insert into public.project_utilities (project_id, utility_type, enabled)
  values
    (new.id, 'electrical', false),
    (new.id, 'water', false),
    (new.id, 'gas', false)
  on conflict (project_id, utility_type) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_project_created
  after insert on public.projects
  for each row execute procedure public.handle_new_project();
