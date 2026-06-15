-- =====================================================================
-- DXE Solutions — Contacts
-- Run this AFTER admin_utilities_function.sql
--
-- Adds a global contacts table for people Dixie works with regularly
-- (consultants, vendors, inspectors, etc). Contacts can optionally be
-- linked to one or more projects via project_contacts.
-- =====================================================================

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  trade text,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

alter table public.contacts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'contacts' and policyname = 'Admins can manage contacts'
  ) then
    create policy "Admins can manage contacts"
      on public.contacts for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Link table: contacts <-> projects (many-to-many)
-- ---------------------------------------------------------------------
create table if not exists public.project_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(project_id, contact_id)
);

alter table public.project_contacts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'project_contacts' and policyname = 'Admins can manage project contacts'
  ) then
    create policy "Admins can manage project contacts"
      on public.project_contacts for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;
