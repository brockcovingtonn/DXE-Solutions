-- =====================================================================
-- DXE Solutions — Fix RLS Infinite Recursion from chat_client_roster_migration.sql
-- Run this immediately after chat_client_roster_migration.sql (or in
-- place of re-running it, if you already ran the broken version).
--
-- The "Clients can view employee assignments on their own projects"
-- policy queried projects directly from inside a policy on
-- project_employees. But projects already has a policy ("Employees can
-- view their assigned projects") that queries project_employees right
-- back — creating a cycle: project_employees -> projects ->
-- project_employees -> projects -> ... forever. Postgres detects this
-- as error 42P17 ("infinite recursion detected in policy"), and it
-- broke EVERY query against profiles/projects/project_employees for
-- EVERY account (not just clients) — including the plain "what's my
-- role" lookup on login.
--
-- Fix: route the ownership check through a security-definer function,
-- the same pattern is_admin()/is_employee() already use. A
-- security-definer function's internal queries bypass RLS entirely, so
-- checking project ownership this way never re-triggers projects' own
-- policies, and the cycle can't form.
-- =====================================================================

create or replace function public.owns_project(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.projects where id = p_project_id and owner_id = auth.uid()
  );
$$ language sql security definer stable;

drop policy if exists "Clients can view employee assignments on their own projects" on public.project_employees;
create policy "Clients can view employee assignments on their own projects"
  on public.project_employees for select
  using (public.owns_project(project_id));

drop policy if exists "Clients can view employee profiles on their own projects" on public.profiles;
create policy "Clients can view employee profiles on their own projects"
  on public.profiles for select
  using (
    id in (
      select employee_id from public.project_employees pe
      where public.owns_project(pe.project_id)
    )
  );
