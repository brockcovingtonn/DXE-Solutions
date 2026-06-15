-- =====================================================================
-- DXE Solutions — Utility Entries Restructure
-- Run this AFTER feature_migration.sql
--
-- This migration moves the per-utility tracking fields (application,
-- work request number, status, action step, comments) out of
-- project_utilities and into a new project_utility_entries table,
-- allowing multiple entries per utility type.
--
-- If you have NOT yet run feature_migration.sql, run that first,
-- then run this one. If feature_migration.sql in your project already
-- matches the new structure (no application/status columns on
-- project_utilities), this migration is a no-op and safe to skip.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Create project_utility_entries table (if it doesn't exist yet)
-- ---------------------------------------------------------------------
create table if not exists public.project_utility_entries (
  id uuid primary key default gen_random_uuid(),
  utility_id uuid references public.project_utilities(id) on delete cascade,
  application text,
  work_request_number text,
  status text default 'not_ready',
  action_step text,
  comments text,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.project_utility_entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'project_utility_entries' and policyname = 'Admins can view all utility entries'
  ) then
    create policy "Admins can view all utility entries"
      on public.project_utility_entries for select
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'project_utility_entries' and policyname = 'Admins can insert utility entries'
  ) then
    create policy "Admins can insert utility entries"
      on public.project_utility_entries for insert
      with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'project_utility_entries' and policyname = 'Admins can update utility entries'
  ) then
    create policy "Admins can update utility entries"
      on public.project_utility_entries for update
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'project_utility_entries' and policyname = 'Admins can delete utility entries'
  ) then
    create policy "Admins can delete utility entries"
      on public.project_utility_entries for delete
      using (public.is_admin());
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Migrate existing data from project_utilities into the new table
-- (only runs if the old columns still exist)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'project_utilities' and column_name = 'application'
  ) then
    insert into public.project_utility_entries (utility_id, application, work_request_number, status, action_step, comments, sort_order)
    select id, application, work_request_number, status, action_step, comments, 1
    from public.project_utilities
    where application is not null
       or work_request_number is not null
       or (status is not null and status <> 'not_ready')
       or action_step is not null
       or comments is not null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Drop old columns from project_utilities
-- ---------------------------------------------------------------------
alter table public.project_utilities drop column if exists application;
alter table public.project_utilities drop column if exists work_request_number;
alter table public.project_utilities drop column if exists status;
alter table public.project_utilities drop column if exists action_step;
alter table public.project_utilities drop column if exists comments;

-- ---------------------------------------------------------------------
-- 4. Replace get_project_utilities to include entries as JSON array
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
