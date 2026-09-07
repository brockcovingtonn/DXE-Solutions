-- =====================================================================
-- DXE Solutions — Document Signatures (E-Signature) Migration
-- Run this any time after employee_role_migration.sql and
-- client_activity_log_migration.sql.
--
-- Only PDF documents can be signed (the signature is stamped onto a
-- new last page of the PDF — non-PDF files have nothing to stamp onto,
-- so the "Sign Document" button never appears for them). Signing is
-- purely additive: documents.badge is never touched. A document is
-- "signed" if a row exists here for it — one document can only ever
-- have one signature (enforced via a unique index).
--
-- After running this, go to Storage in the Supabase dashboard and
-- create a new bucket named `document-signatures` (private) — the
-- storage policies below depend on it existing. Paths are
-- `<document_id>/signature-<ts>.png` and `<document_id>/signed-<ts>.pdf`.
-- =====================================================================

create table public.document_signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  signed_by uuid references public.profiles(id),
  signer_name text not null,
  signature_path text not null,
  signed_pdf_path text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create unique index document_signatures_document_id_key on public.document_signatures (document_id);

alter table public.document_signatures enable row level security;

create policy "Admins can view all document signatures"
  on public.document_signatures for select
  using (public.is_admin());

create policy "Admins can delete document signatures"
  on public.document_signatures for delete
  using (public.is_admin());

create policy "Clients can view signatures on their project documents"
  on public.document_signatures for select
  using (
    document_id in (
      select d.id from public.documents d
      join public.projects p on p.id = d.project_id
      where p.owner_id = auth.uid()
    )
  );

create policy "Clients can sign their project documents"
  on public.document_signatures for insert
  with check (
    signed_by = auth.uid()
    and document_id in (
      select d.id from public.documents d
      join public.projects p on p.id = d.project_id
      where p.owner_id = auth.uid()
    )
  );

create policy "Employees can view signatures on assigned project documents"
  on public.document_signatures for select
  using (
    document_id in (
      select d.id from public.documents d
      where d.project_id in (select project_id from public.project_employees where employee_id = auth.uid())
    )
  );

create policy "Employees can sign assigned project documents"
  on public.document_signatures for insert
  with check (
    signed_by = auth.uid()
    and document_id in (
      select d.id from public.documents d
      where d.project_id in (select project_id from public.project_employees where employee_id = auth.uid())
    )
  );

-- Storage: same three-way scoping as every other project-linked bucket.
create policy "Admins can read document signature files"
  on storage.objects for select
  using (bucket_id = 'document-signatures' and public.is_admin());

create policy "Clients can read their document signature files"
  on storage.objects for select
  using (
    bucket_id = 'document-signatures'
    and (storage.foldername(name))[1]::uuid in (
      select d.id from public.documents d
      join public.projects p on p.id = d.project_id
      where p.owner_id = auth.uid()
    )
  );

create policy "Clients can upload their document signature files"
  on storage.objects for insert
  with check (
    bucket_id = 'document-signatures'
    and (storage.foldername(name))[1]::uuid in (
      select d.id from public.documents d
      join public.projects p on p.id = d.project_id
      where p.owner_id = auth.uid()
    )
  );

create policy "Employees can read their document signature files"
  on storage.objects for select
  using (
    bucket_id = 'document-signatures'
    and (storage.foldername(name))[1]::uuid in (
      select d.id from public.documents d
      where d.project_id in (select project_id from public.project_employees where employee_id = auth.uid())
    )
  );

create policy "Employees can upload their document signature files"
  on storage.objects for insert
  with check (
    bucket_id = 'document-signatures'
    and (storage.foldername(name))[1]::uuid in (
      select d.id from public.documents d
      where d.project_id in (select project_id from public.project_employees where employee_id = auth.uid())
    )
  );
