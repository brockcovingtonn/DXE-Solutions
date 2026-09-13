-- =====================================================================
-- DXE Solutions — e-signature on proposals
--
-- Mirrors the existing document_signatures pattern (one signature per
-- proposal, RLS-only authorization, a dedicated storage bucket for the
-- signature image + resulting signed PDF). Unlike documents (arbitrary
-- uploaded PDFs, signed by appending a confirmation page), a signed
-- proposal is regenerated from proposal + line item data with the
-- signature drawn directly onto the existing Authorization block — see
-- lib/proposal-pdf.js. proposals.pdf_path (the original) is left
-- untouched; the signed copy lives separately, same as documents.
-- =====================================================================

alter table public.proposals
  add column if not exists signed_at timestamptz;

create table if not exists public.proposal_signatures (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals(id) on delete cascade,
  signed_by uuid references public.profiles(id) on delete set null,
  signer_name text not null,
  signature_path text not null,
  signed_pdf_path text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.proposal_signatures enable row level security;

drop policy if exists "Admins can view all proposal signatures" on public.proposal_signatures;
create policy "Admins can view all proposal signatures" on public.proposal_signatures
  for select using (is_admin());

drop policy if exists "Admins can delete proposal signatures" on public.proposal_signatures;
create policy "Admins can delete proposal signatures" on public.proposal_signatures
  for delete using (is_admin());

-- A client can only sign a proposal that's currently shared with
-- them — the same visibility flag that gates whether they can even
-- see it (see proposal_visibility_migration.sql).
drop policy if exists "Clients can sign their visible proposals" on public.proposal_signatures;
create policy "Clients can sign their visible proposals" on public.proposal_signatures
  for insert with check (
    signed_by = auth.uid()
    and proposal_id in (
      select p.id from public.proposals p
      where p.status <> 'draft'
        and p.visible_to_client = true
        and p.project_id in (select id from public.projects where owner_id = auth.uid())
    )
  );

drop policy if exists "Clients can view signatures on their proposals" on public.proposal_signatures;
create policy "Clients can view signatures on their proposals" on public.proposal_signatures
  for select using (
    proposal_id in (
      select p.id from public.proposals p
      where p.project_id in (select id from public.projects where owner_id = auth.uid())
    )
  );

-- Storage bucket for the signature PNG + signed PDF, mirroring
-- document-signatures. Paths are {proposalId}/signature-*.png and
-- {proposalId}/signed-*.pdf.
insert into storage.buckets (id, name, public)
values ('proposal-signatures', 'proposal-signatures', false)
on conflict (id) do nothing;

drop policy if exists "Admins can read proposal signature files" on storage.objects;
create policy "Admins can read proposal signature files" on storage.objects
  for select using (bucket_id = 'proposal-signatures' and is_admin());

drop policy if exists "Clients can read their proposal signature files" on storage.objects;
create policy "Clients can read their proposal signature files" on storage.objects
  for select using (
    bucket_id = 'proposal-signatures'
    and (storage.foldername(name))[1]::uuid in (
      select pr.id from public.proposals pr
      join public.projects p on p.id = pr.project_id
      where p.owner_id = auth.uid()
    )
  );

drop policy if exists "Clients can upload their proposal signature files" on storage.objects;
create policy "Clients can upload their proposal signature files" on storage.objects
  for insert with check (
    bucket_id = 'proposal-signatures'
    and (storage.foldername(name))[1]::uuid in (
      select pr.id from public.proposals pr
      join public.projects p on p.id = pr.project_id
      where p.owner_id = auth.uid()
    )
  );

-- Clients have no UPDATE policy on proposals at all (only SELECT) —
-- correctly so, they shouldn't be able to edit proposal content. But
-- that means the sign route's own client-scoped update of
-- proposals.signed_at silently affects zero rows under RLS. A
-- SECURITY DEFINER trigger (same mechanism as handle_new_user()) sets
-- it as a side effect of the signature insert instead, which clients
-- already have permission for.
create or replace function public.mark_proposal_signed()
returns trigger as $$
begin
  update public.proposals set signed_at = now() where id = new.proposal_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_mark_proposal_signed on public.proposal_signatures;
create trigger trg_mark_proposal_signed
  after insert on public.proposal_signatures
  for each row execute function public.mark_proposal_signed();
