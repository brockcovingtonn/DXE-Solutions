-- =====================================================================
-- DXE Solutions — Document Templates
-- Run this AFTER contacts_migration.sql
--
-- Adds a templates table for standard documents Dixie reuses across
-- projects (e.g. blank inspection checklists, standard scopes of work).
-- Templates are stored in a Supabase Storage bucket and can be applied
-- (copied) to a project's Documents.
-- =====================================================================

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  file_path text not null,
  file_name text not null,
  file_size bigint,
  category text,
  created_at timestamptz default now()
);

alter table public.document_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'document_templates' and policyname = 'Admins can manage templates'
  ) then
    create policy "Admins can manage templates"
      on public.document_templates for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Storage bucket for templates
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('document-templates', 'document-templates', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'Admins can manage template files'
  ) then
    create policy "Admins can manage template files"
      on storage.objects for all
      using (bucket_id = 'document-templates' and public.is_admin())
      with check (bucket_id = 'document-templates' and public.is_admin());
  end if;
end $$;
