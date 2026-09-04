-- =====================================================================
-- DXE Solutions — Accounting / Invoices Migration
-- Run this any time after employee_role_migration.sql.
--
-- One table covers both invoices (what the client owes) and receipts
-- (proof of an expense DXE covered on the client's behalf, e.g. a city
-- fee) — distinguished by `kind`. Balance due is computed client-side
-- as the sum of unpaid invoice amounts; it isn't a stored column.
-- =====================================================================

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null default 'invoice', -- invoice | receipt
  description text not null,
  amount numeric(10, 2) not null,
  status text not null default 'unpaid', -- unpaid | paid
  due_date date,
  paid_date date,
  file_path text,  -- optional attached PDF, in the project-invoices bucket
  file_name text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.invoices enable row level security;

-- Admins: full control
create policy "Admins can view all invoices"
  on public.invoices for select
  using (public.is_admin());

create policy "Admins can insert invoices"
  on public.invoices for insert
  with check (public.is_admin());

create policy "Admins can update invoices"
  on public.invoices for update
  using (public.is_admin());

create policy "Admins can delete invoices"
  on public.invoices for delete
  using (public.is_admin());

-- Employees: read-only, scoped to projects they're assigned to
create policy "Employees can view invoices on assigned projects"
  on public.invoices for select
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

-- Clients: read-only, on their own projects
create policy "Clients can view invoices on their own projects"
  on public.invoices for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- Storage bucket
-- Go to Storage in the Supabase dashboard and create a new bucket named
-- "project-invoices" (private), the same way "project-documents" and
-- "project-photos" were created. Then run the policies below.
-- ---------------------------------------------------------------------

create policy "Admins can read all invoice files"
  on storage.objects for select
  using (bucket_id = 'project-invoices' and public.is_admin());

create policy "Admins can upload invoice files"
  on storage.objects for insert
  with check (bucket_id = 'project-invoices' and public.is_admin());

create policy "Admins can delete invoice files"
  on storage.objects for delete
  using (bucket_id = 'project-invoices' and public.is_admin());

create policy "Employees can read invoice files on assigned projects"
  on storage.objects for select
  using (
    bucket_id = 'project-invoices'
    and (storage.foldername(name))[1]::uuid in (
      select project_id from public.project_employees where employee_id = auth.uid()
    )
  );

create policy "Clients can read their project invoice files"
  on storage.objects for select
  using (
    bucket_id = 'project-invoices'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.projects where owner_id = auth.uid()
    )
  );
