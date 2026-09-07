-- =====================================================================
-- DXE Solutions — Push Notifications
-- Run this any time.
--
-- Stores one row per device a user has signed into the native app on,
-- so the server can push to every device they're logged in on. A user
-- manages only their own rows (insert/update/delete); there's no client
-- select policy since nobody but the server (service-role, when
-- actually sending pushes) ever needs to read another user's token.
-- =====================================================================

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  token text not null,
  environment text not null default 'production', -- 'production' | 'sandbox'
  updated_at timestamptz default now(),
  unique (user_id, token)
);

alter table public.device_tokens enable row level security;

create policy "Users can view their own device tokens"
  on public.device_tokens for select
  using (user_id = auth.uid());

create policy "Users can insert their own device tokens"
  on public.device_tokens for insert
  with check (user_id = auth.uid());

create policy "Users can update their own device tokens"
  on public.device_tokens for update
  using (user_id = auth.uid());

create policy "Users can delete their own device tokens"
  on public.device_tokens for delete
  using (user_id = auth.uid());
