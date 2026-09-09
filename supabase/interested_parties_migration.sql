-- =====================================================================
-- DXE Solutions — Project Interested Parties
-- Additional owners, LLCs, or other stakeholders with an interest in
-- the property, distinct from project_team (trades/contractors doing
-- the work). Mirrors project_team's shape and RLS pattern.
-- =====================================================================

create table public.project_interested_parties (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  relationship text, -- e.g. 'Owner', 'Co-Owner', 'LLC', 'Trustee'
  phone text,
  email text,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.project_interested_parties enable row level security;

create policy "Clients can view interested parties for their own projects"
  on public.project_interested_parties for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Admins can view all interested parties"
  on public.project_interested_parties for select
  using (public.is_admin());

create policy "Admins can insert interested parties"
  on public.project_interested_parties for insert
  with check (public.is_admin());

create policy "Admins can update interested parties"
  on public.project_interested_parties for update
  using (public.is_admin());

create policy "Admins can delete interested parties"
  on public.project_interested_parties for delete
  using (public.is_admin());
