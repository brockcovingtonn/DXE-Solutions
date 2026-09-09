-- =====================================================================
-- DXE Solutions — Employee Contacts/Templates/Accounting Access
-- Run any time after client_employee_contacts_migration.sql,
-- templates_migration.sql, and invoices_migration.sql.
--
-- Contacts: employees already have read access to contacts linked to
-- their assigned projects (client_employee_contacts_migration.sql) —
-- no schema change needed there, just the new employee page.
--
-- Templates: adds a shared_with_employees flag so admin chooses which
-- templates employees can see/download, plus RLS for it.
--
-- Accounting (invoices): employees can now submit an entry
-- (reimbursement or a project-related receipt) for a project they're
-- assigned to — it lands as approval_status='pending' and is invisible
-- to the client until an admin approves it AND explicitly marks it
-- visible_to_client. Admin-created entries default to already-approved
-- (unchanged behavior), matching how the app worked before this
-- migration. visible_to_client defaults to false for everyone now —
-- previously clients saw every invoice/receipt unconditionally; this
-- makes sharing an explicit admin action instead.
-- =====================================================================

alter table public.document_templates
  add column if not exists shared_with_employees boolean not null default false;

create policy "Employees can view shared templates"
  on public.document_templates for select
  using (shared_with_employees = true);

create policy "Employees can read shared template files"
  on storage.objects for select
  using (
    bucket_id = 'document-templates'
    and exists (
      select 1 from public.document_templates t
      where t.file_path = storage.objects.name and t.shared_with_employees = true
    )
  );

alter table public.invoices
  add column if not exists approval_status text not null default 'approved',
  add column if not exists visible_to_client boolean not null default false;

alter table public.invoices
  add constraint invoices_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected'));

-- Replace the old unconditional client policy with a gated one.
drop policy if exists "Clients can view invoices on their own projects" on public.invoices;

create policy "Clients can view shared invoices on their own projects"
  on public.invoices for select
  using (
    visible_to_client = true
    and approval_status = 'approved'
    and project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Employees can submit accounting entries on assigned projects"
  on public.invoices for insert
  with check (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can upload invoice files on assigned projects"
  on storage.objects for insert
  with check (
    bucket_id = 'project-invoices'
    and (storage.foldername(name))[1]::uuid in (
      select project_id from public.project_employees where employee_id = auth.uid()
    )
  );
