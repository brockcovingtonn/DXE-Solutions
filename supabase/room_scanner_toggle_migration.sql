alter table public.projects
  add column if not exists room_scanner_enabled boolean not null default false;
