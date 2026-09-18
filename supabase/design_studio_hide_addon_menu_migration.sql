alter table public.design_studio_quotes
  add column if not exists hide_addon_menu boolean not null default false;
