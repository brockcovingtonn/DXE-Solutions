-- =====================================================================
-- DXE Solutions — Chat Attachments Migration
-- Run this any time after chat_dm_migration.sql.
--
-- Lets a message carry a photo or file alongside (or instead of) text.
-- Storage paths follow the same "who owns this thread" convention as
-- the rest of the app:
--   dm/<dm_user_id>/<filename>        — DM thread attachments
--   project/<project_id>/<filename>   — project thread attachments
--
-- After running this, go to Storage in the Supabase dashboard and
-- create a new bucket named `chat-attachments` (private) — the same
-- way `project-documents`/`project-photos`/`project-invoices` were
-- created — the storage policies below depend on that bucket existing.
-- =====================================================================

alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text;

-- Admins can already read/insert every message row (messages_migration.sql);
-- mirror that for the storage objects backing attachments.
create policy "Admins can read chat attachments"
  on storage.objects for select
  using (bucket_id = 'chat-attachments' and public.is_admin());

create policy "Admins can upload chat attachments"
  on storage.objects for insert
  with check (bucket_id = 'chat-attachments' and public.is_admin());

-- DM thread attachments: ownership is just "this is my own DM thread",
-- true for any client or employee regardless of role, so one pair of
-- policies covers both.
create policy "Users can read their own DM chat attachments"
  on storage.objects for select
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'dm'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can upload their own DM chat attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'dm'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Project thread attachments: clients (project owner) and employees
-- (assigned to the project).
create policy "Clients can read their project chat attachments"
  on storage.objects for select
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'project'
    and (storage.foldername(name))[2]::uuid in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Clients can upload their project chat attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'project'
    and (storage.foldername(name))[2]::uuid in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Employees can read their project chat attachments"
  on storage.objects for select
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'project'
    and (storage.foldername(name))[2]::uuid in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can upload their project chat attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'project'
    and (storage.foldername(name))[2]::uuid in (select project_id from public.project_employees where employee_id = auth.uid())
  );
