-- =====================================================================
-- DXE Solutions — Client Reviews Migration
-- Run this any time after admin_migration.sql.
--
-- One review per project, submitted by the client who owns it. Admin
-- can mark specific reviews "featured" to surface them as public
-- testimonials on the marketing site — featured reviews are readable by
-- anyone, signed in or not.
-- =====================================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  client_name text not null,
  project_type text,
  rating int not null check (rating >= 1 and rating <= 5),
  body text,
  featured boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id)
);

alter table public.reviews enable row level security;

-- Admins: full control (view all, feature/unfeature, remove if needed)
create policy "Admins can view all reviews"
  on public.reviews for select
  using (public.is_admin());

create policy "Admins can update reviews"
  on public.reviews for update
  using (public.is_admin());

create policy "Admins can delete reviews"
  on public.reviews for delete
  using (public.is_admin());

-- Clients: manage their own review, on a project they own
create policy "Clients can view their own review"
  on public.reviews for select
  using (client_id = auth.uid());

create policy "Clients can insert their own review"
  on public.reviews for insert
  with check (
    client_id = auth.uid()
    and project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Clients can update their own review"
  on public.reviews for update
  using (client_id = auth.uid());

create policy "Clients can delete their own review"
  on public.reviews for delete
  using (client_id = auth.uid());

-- Public: featured reviews are visible to everyone, including
-- signed-out visitors on the marketing site.
create policy "Public can view featured reviews"
  on public.reviews for select
  using (featured = true);
