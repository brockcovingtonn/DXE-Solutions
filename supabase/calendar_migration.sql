-- =====================================================================
-- DXE Solutions — Calendar Migration
-- Run this any time after employee_role_migration.sql.
--
-- calendar_events: project_id is nullable — a null project_id is a
-- general/firm event (e.g. "Dixie out of office") that only admins see.
-- Tagging visible_to_client on a project-linked event is what surfaces
-- it on that client's portal calendar.
--
-- google_calendar_connections stores OAuth tokens for one-way sync
-- (app → Google). It deliberately has NO client-readable RLS policy —
-- not even for the admin who owns the row. Refresh tokens are sensitive;
-- this table is only ever touched server-side via the service-role
-- client (lib/supabase-admin.js), which bypasses RLS entirely.
-- =====================================================================

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  all_day boolean not null default false,
  visible_to_client boolean not null default false,
  google_event_id text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.calendar_events enable row level security;

create policy "Admins can view all calendar events"
  on public.calendar_events for select
  using (public.is_admin());

create policy "Admins can insert calendar events"
  on public.calendar_events for insert
  with check (public.is_admin());

create policy "Admins can update calendar events"
  on public.calendar_events for update
  using (public.is_admin());

create policy "Admins can delete calendar events"
  on public.calendar_events for delete
  using (public.is_admin());

create policy "Employees can view calendar events on assigned projects"
  on public.calendar_events for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Clients can view visible calendar events on their projects"
  on public.calendar_events for select
  using (
    visible_to_client = true
    and project_id in (select id from public.projects where owner_id = auth.uid())
  );

create table public.google_calendar_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  calendar_id text not null default 'primary',
  connected_at timestamptz default now()
);

alter table public.google_calendar_connections enable row level security;
-- No select/insert/update/delete policies for authenticated or anon roles
-- on purpose — server-only access via the service-role client.
