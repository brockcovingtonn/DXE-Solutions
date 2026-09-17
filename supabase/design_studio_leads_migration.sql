-- ============================================================================
-- Design Studio — lead capture (Book-a-call form + staff "Send Intake Form")
-- Run once in the Supabase SQL Editor.
--
-- A lead exists only between "someone asked to be contacted" and "they
-- filled out the intake form" — at that point it converts into a real
-- design_studio_quotes draft (client account created/found, source set to
-- 'web_lead') and this row is deleted. Nothing shows up in the Design
-- Studio dashboard until conversion.
-- ============================================================================

create table if not exists public.design_studio_leads (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  full_name text,
  email text,
  phone text,
  project_address text,
  intake jsonb not null default '{}'::jsonb,
  converted_quote_id uuid references public.design_studio_quotes(id),
  created_at timestamptz not null default now()
);

alter table public.design_studio_leads enable row level security;

alter table public.design_studio_quotes
  add column if not exists source text not null default 'staff';
