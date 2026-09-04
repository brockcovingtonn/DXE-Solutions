-- =====================================================================
-- DXE Solutions — Chat Migration
-- Run this any time after employee_role_migration.sql.
--
-- One chat thread per project. Participants are the client who owns the
-- project, any admin, and any employee assigned to that project — the
-- same three-way scoping used everywhere else in the app. Realtime is
-- enabled so messages appear live without a page refresh; Supabase
-- Realtime evaluates the same RLS policies below per connected client,
-- so nobody receives a postgres_changes event for a project they
-- couldn't otherwise query.
-- =====================================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  sender_name text not null,
  sender_role text not null default 'client', -- client | admin | employee
  body text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Admins can view all messages"
  on public.messages for select
  using (public.is_admin());

create policy "Admins can insert messages"
  on public.messages for insert
  with check (public.is_admin() and sender_id = auth.uid());

create policy "Clients can view messages on their projects"
  on public.messages for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Clients can insert messages on their projects"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Employees can view messages on assigned projects"
  on public.messages for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can insert messages on assigned projects"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

-- Opt this table into Supabase Realtime so new messages broadcast live.
alter publication supabase_realtime add table public.messages;
