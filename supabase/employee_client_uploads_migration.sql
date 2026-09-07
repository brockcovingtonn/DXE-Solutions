-- =====================================================================
-- DXE Solutions — Employee & Client Photo/Document Upload Migration
-- Run this any time after employee_role_migration.sql.
--
-- Previously only admins could insert into `documents`/`photos` (and
-- their storage buckets) except for one carve-out: clients could
-- already upload documents. This adds the remaining combinations so
-- the native app's camera capture / document scanner feature works for
-- every role:
--   - Employees can upload documents to projects they're assigned to
--   - Clients can upload photos to their own projects
--   - Employees can upload photos to projects they're assigned to
-- =====================================================================

create policy "Employees can upload documents to assigned projects"
  on public.documents for insert
  with check (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Clients can upload photos to their own projects"
  on public.photos for insert
  with check (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Employees can upload photos to assigned projects"
  on public.photos for insert
  with check (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

-- Storage: employees can upload documents for assigned projects
create policy "Employees can upload documents of assigned projects"
  on storage.objects for insert
  with check (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1]::uuid in (
      select project_id from public.project_employees where employee_id = auth.uid()
    )
  );

-- Storage: clients can upload photos for their own projects
create policy "Clients can upload to their project photos"
  on storage.objects for insert
  with check (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.projects where owner_id = auth.uid()
    )
  );

-- Storage: employees can upload photos for assigned projects
create policy "Employees can upload photos of assigned projects"
  on storage.objects for insert
  with check (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1]::uuid in (
      select project_id from public.project_employees where employee_id = auth.uid()
    )
  );
