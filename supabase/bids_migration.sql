-- =====================================================================
-- DXE Solutions — Construction bids
--
-- Lets an admin build an itemized construction bid for a project from a
-- toggleable catalog of scope items (demolition, framing, electrical,
-- etc.), save it as a draft, finalize it into a generated PDF, and email
-- it to the client. Admin/back-office only — not exposed to the client
-- portal.
-- =====================================================================

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'draft',        -- 'draft' | 'finalized' | 'sent'
  title text not null default 'Bid',
  client_name text,
  project_address text,
  prepared_by text,
  scope_summary text,
  selected_scopes text[] not null default '{}',
  subtotal numeric not null default 0,
  adjustment numeric not null default 0,
  adjustment_label text,
  total numeric not null default 0,
  payment_terms text,
  valid_until date,
  notes text,
  pdf_path text,
  sent_to_email text,
  sent_at timestamptz,
  finalized_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bids_project_id_idx on public.bids (project_id);

create table if not exists public.bid_line_items (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.bids(id) on delete cascade,
  category text not null,
  description text,
  quantity numeric not null default 1,
  unit text not null default 'LS',
  unit_price numeric not null default 0,
  amount numeric not null default 0,
  sort_order integer not null default 0
);

create index if not exists bid_line_items_bid_id_idx on public.bid_line_items (bid_id);
-- Used by the "estimate from past bids" average-price lookup.
create index if not exists bid_line_items_category_idx on public.bid_line_items (category);

alter table public.bids enable row level security;
alter table public.bid_line_items enable row level security;

drop policy if exists "Admins manage bids" on public.bids;
create policy "Admins manage bids" on public.bids
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage bid line items" on public.bid_line_items;
create policy "Admins manage bid line items" on public.bid_line_items
  for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
  values ('project-bids', 'project-bids', false)
  on conflict (id) do nothing;

drop policy if exists "Admins manage bid pdfs" on storage.objects;
create policy "Admins manage bid pdfs" on storage.objects
  for all using (bucket_id = 'project-bids' and public.is_admin())
  with check (bucket_id = 'project-bids' and public.is_admin());
