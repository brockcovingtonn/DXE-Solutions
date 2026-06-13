-- =====================================================================
-- DXE Solutions — Database Schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CLIENT PROFILES
-- One row per authenticated user, linked to Supabase auth.users
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  email text,
  phone text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 2. PROJECTS
-- Each project belongs to one client (owner). Dixie manages all.
-- ---------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  address text,
  project_type text,
  estimated_value text,
  pm_name text default 'Dixie Evans, PE',
  started_on date,
  estimated_completion date,
  progress_pct int default 0,
  status text default 'active', -- active | planning | completed | on-hold
  created_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Clients can view their own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- 3. PROJECT PHASES
-- The 6-phase progress tracker (Pre-Design, Permits, Site Work, etc.)
-- ---------------------------------------------------------------------
create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  pct int default 0,
  sort_order int default 0,
  state text default 'pending' -- done | active | pending
);

alter table public.project_phases enable row level security;

create policy "Clients can view phases of their own projects"
  on public.project_phases for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 4. MILESTONES
-- Timeline items shown on the dashboard
-- ---------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  target_date date,
  display_date text, -- e.g. "Est. Dec 2025" for flexibility
  state text default 'pending', -- done | active | pending
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.milestones enable row level security;

create policy "Clients can view milestones of their own projects"
  on public.milestones for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 5. DOCUMENTS
-- Metadata for files stored in Supabase Storage (bucket: project-documents)
-- ---------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  uploaded_by_role text not null default 'client', -- 'client' | 'dxe'
  file_name text not null,
  file_path text not null, -- path within storage bucket
  file_type text,
  badge text default 'new', -- new | signed | pending
  created_at timestamptz default now()
);

alter table public.documents enable row level security;

create policy "Clients can view documents of their own projects"
  on public.documents for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Clients can upload documents to their own projects"
  on public.documents for insert
  with check (
    project_id in (select id from public.projects where owner_id = auth.uid())
    and uploaded_by = auth.uid()
  );

-- ---------------------------------------------------------------------
-- 6. PHOTOS
-- Metadata for progress photos stored in Supabase Storage (bucket: project-photos)
-- ---------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  file_path text not null,
  caption text,
  taken_on date,
  created_at timestamptz default now()
);

alter table public.photos enable row level security;

create policy "Clients can view photos of their own projects"
  on public.photos for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 7. NOTES
-- Threaded notes/updates between Dixie and the client
-- ---------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id),
  author_name text not null,
  author_role text not null default 'client', -- 'client' | 'dxe'
  body text not null,
  created_at timestamptz default now()
);

alter table public.notes enable row level security;

create policy "Clients can view notes on their own projects"
  on public.notes for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Clients can post notes on their own projects"
  on public.notes for insert
  with check (
    project_id in (select id from public.projects where owner_id = auth.uid())
    and author_id = auth.uid()
  );

-- ---------------------------------------------------------------------
-- 8. ACTIVITY FEED
-- Auto-generated or manually logged activity items for the dashboard feed
-- ---------------------------------------------------------------------
create table public.activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  type text not null, -- note | doc | status | photo
  text text not null,
  created_at timestamptz default now()
);

alter table public.activity enable row level security;

create policy "Clients can view activity on their own projects"
  on public.activity for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 9. AUTO-CREATE PROFILE ON SIGNUP
-- Trigger that inserts a row into profiles whenever a new auth user is created
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- STORAGE BUCKETS
-- Run separately, or create via Dashboard > Storage > New Bucket
-- =====================================================================

-- After running the table creation above, go to Storage in the Supabase
-- dashboard and create two buckets:
--   1. "project-documents" (private)
--   2. "project-photos" (private)
--
-- Then run the policies below so users can only access files for
-- projects they own. These reference the folder structure:
--   project-documents/{project_id}/{filename}
--   project-photos/{project_id}/{filename}

-- Documents bucket policies
create policy "Clients can read their project documents"
  on storage.objects for select
  using (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.projects where owner_id = auth.uid()
    )
  );

create policy "Clients can upload to their project documents"
  on storage.objects for insert
  with check (
    bucket_id = 'project-documents'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.projects where owner_id = auth.uid()
    )
  );

-- Photos bucket policies
create policy "Clients can read their project photos"
  on storage.objects for select
  using (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.projects where owner_id = auth.uid()
    )
  );
