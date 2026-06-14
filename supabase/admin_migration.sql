-- =====================================================================
-- DXE Solutions — Admin Role Migration
-- Run this AFTER schema.sql (and seed.sql if you've already run it)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Add an is_admin flag to profiles
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean default false;

-- ---------------------------------------------------------------------
-- 2. Helper function: check if the current user is an admin
-- Defined as SECURITY DEFINER so it can read profiles without
-- recursively triggering RLS on profiles itself.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer stable;

-- ---------------------------------------------------------------------
-- 3. Update RLS policies so admins can see / manage everything
-- ---------------------------------------------------------------------

-- PROFILES: admins can view & update all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

-- PROJECTS: admins can do everything
create policy "Admins can view all projects"
  on public.projects for select
  using (public.is_admin());

create policy "Admins can insert projects"
  on public.projects for insert
  with check (public.is_admin());

create policy "Admins can update projects"
  on public.projects for update
  using (public.is_admin());

create policy "Admins can delete projects"
  on public.projects for delete
  using (public.is_admin());

-- PROJECT PHASES
create policy "Admins can view all phases"
  on public.project_phases for select
  using (public.is_admin());

create policy "Admins can insert phases"
  on public.project_phases for insert
  with check (public.is_admin());

create policy "Admins can update phases"
  on public.project_phases for update
  using (public.is_admin());

create policy "Admins can delete phases"
  on public.project_phases for delete
  using (public.is_admin());

-- MILESTONES
create policy "Admins can view all milestones"
  on public.milestones for select
  using (public.is_admin());

create policy "Admins can insert milestones"
  on public.milestones for insert
  with check (public.is_admin());

create policy "Admins can update milestones"
  on public.milestones for update
  using (public.is_admin());

create policy "Admins can delete milestones"
  on public.milestones for delete
  using (public.is_admin());

-- DOCUMENTS
create policy "Admins can view all documents"
  on public.documents for select
  using (public.is_admin());

create policy "Admins can insert documents"
  on public.documents for insert
  with check (public.is_admin());

create policy "Admins can update documents"
  on public.documents for update
  using (public.is_admin());

create policy "Admins can delete documents"
  on public.documents for delete
  using (public.is_admin());

-- PHOTOS
create policy "Admins can view all photos"
  on public.photos for select
  using (public.is_admin());

create policy "Admins can insert photos"
  on public.photos for insert
  with check (public.is_admin());

create policy "Admins can delete photos"
  on public.photos for delete
  using (public.is_admin());

-- NOTES
create policy "Admins can view all notes"
  on public.notes for select
  using (public.is_admin());

create policy "Admins can insert notes"
  on public.notes for insert
  with check (public.is_admin());

-- ACTIVITY
create policy "Admins can view all activity"
  on public.activity for select
  using (public.is_admin());

create policy "Admins can insert activity"
  on public.activity for insert
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Storage policies — admins can read/write all project files
-- ---------------------------------------------------------------------
create policy "Admins can read all documents"
  on storage.objects for select
  using (bucket_id = 'project-documents' and public.is_admin());

create policy "Admins can upload documents"
  on storage.objects for insert
  with check (bucket_id = 'project-documents' and public.is_admin());

create policy "Admins can read all photos"
  on storage.objects for select
  using (bucket_id = 'project-photos' and public.is_admin());

create policy "Admins can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'project-photos' and public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Make Dixie an admin
-- Find her user UUID in Authentication > Users, then run:
--
--   update public.profiles set is_admin = true where id = 'HER-UUID-HERE';
--
-- Repeat for any other staff members who need admin access.
-- ---------------------------------------------------------------------
