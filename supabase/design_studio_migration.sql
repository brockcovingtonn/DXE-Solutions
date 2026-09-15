-- ============================================================================
-- Northlight Studio (Design Studio) — schema migration
-- Run once in the Supabase SQL Editor.
--
-- RLS is enabled with NO policies on both tables. That is deliberate: every
-- read and write goes through server code using the service-role key, after
-- requireStaff()/requireMaster() has run. Nothing is reachable from the browser
-- with an anon or authenticated key.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Rate card. Versioned: saving new rates inserts a row and deactivates the old
-- one, so a quote can always be explained by the rates in force when it issued.
-- ----------------------------------------------------------------------------
create table if not exists public.design_studio_config (
  id          uuid primary key default gen_random_uuid(),
  version     integer not null default 1,
  config      jsonb   not null,
  is_active   boolean not null default true,
  note        text,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create unique index if not exists design_studio_config_one_active
  on public.design_studio_config (is_active)
  where is_active;

-- ----------------------------------------------------------------------------
-- Quotes.
-- `pricing` and `config_snapshot` freeze the full breakdown and the rates used,
-- so reopening a six-month-old proposal shows what the client was actually sent
-- even after the rate card has changed.
-- ----------------------------------------------------------------------------
create sequence if not exists public.design_studio_quote_seq start 1;

create table if not exists public.design_studio_quotes (
  id                uuid primary key default gen_random_uuid(),
  quote_number      text unique not null,
  status            text not null default 'draft'
                    check (status in ('draft','sent','accepted','declined','expired')),

  client_name       text,
  client_email      text,
  client_phone      text,
  project_address   text,

  project_type      text not null,
  service_level     text not null,
  complexity        text not null default 'standard',
  area_sqft         integer not null default 0,

  rush              boolean not null default false,
  trade_partner     boolean not null default false,
  add_ons           jsonb   not null default '{}'::jsonb,
  manual_adjustment numeric not null default 0,
  adjustment_note   text,
  internal_notes    text,

  pricing           jsonb   not null,
  config_snapshot   jsonb   not null,

  total             numeric not null default 0,
  deposit           numeric not null default 0,

  share_token       text unique not null default encode(gen_random_bytes(16), 'hex'),
  valid_until       date,
  sent_at           timestamptz,
  decided_at        timestamptz,

  created_by        uuid references auth.users(id) on delete set null,
  created_by_name   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists design_studio_quotes_created_by_idx on public.design_studio_quotes (created_by);
create index if not exists design_studio_quotes_status_idx     on public.design_studio_quotes (status);
create index if not exists design_studio_quotes_created_at_idx on public.design_studio_quotes (created_at desc);
create index if not exists design_studio_quotes_share_idx      on public.design_studio_quotes (share_token);

-- Human-readable quote numbers: NLS-2026-0001.
-- The prefix is passed in from lib/design-studio/brand.js so renaming the brand
-- does not mean editing SQL.
create or replace function public.design_studio_next_quote_number(prefix text default 'NLS')
returns text
language sql
as $$
  select prefix || '-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.design_studio_quote_seq')::text, 4, '0');
$$;

create or replace function public.design_studio_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists design_studio_quotes_touch on public.design_studio_quotes;
create trigger design_studio_quotes_touch
  before update on public.design_studio_quotes
  for each row execute function public.design_studio_touch();

alter table public.design_studio_config  enable row level security;
alter table public.design_studio_quotes  enable row level security;

-- ----------------------------------------------------------------------------
-- Rollback (keep for reference):
--   drop table if exists public.design_studio_quotes;
--   drop table if exists public.design_studio_config;
--   drop sequence if exists public.design_studio_quote_seq;
--   drop function if exists public.design_studio_next_quote_number();
-- ----------------------------------------------------------------------------
