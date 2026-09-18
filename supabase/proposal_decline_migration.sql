-- =====================================================================
-- DXE Solutions — client decline on proposals
--
-- Mirrors proposal_signature_migration.sql's pattern exactly: clients
-- have no UPDATE policy on proposals, so an insert-only side table +
-- SECURITY DEFINER trigger flips declined_at as a side effect of an
-- insert they DO have permission for.
-- =====================================================================

alter table public.proposals
  add column if not exists declined_at timestamptz;

create table if not exists public.proposal_declines (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals(id) on delete cascade,
  declined_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.proposal_declines enable row level security;

drop policy if exists "Admins can view all proposal declines" on public.proposal_declines;
create policy "Admins can view all proposal declines" on public.proposal_declines
  for select using (is_admin());

drop policy if exists "Admins can delete proposal declines" on public.proposal_declines;
create policy "Admins can delete proposal declines" on public.proposal_declines
  for delete using (is_admin());

-- Same visibility gate as signing — a client can only decline a
-- proposal that's currently shared with them.
drop policy if exists "Clients can decline their visible proposals" on public.proposal_declines;
create policy "Clients can decline their visible proposals" on public.proposal_declines
  for insert with check (
    declined_by = auth.uid()
    and proposal_id in (
      select p.id from public.proposals p
      where p.status <> 'draft'
        and p.visible_to_client = true
        and p.project_id in (select id from public.projects where owner_id = auth.uid())
    )
  );

drop policy if exists "Clients can view declines on their proposals" on public.proposal_declines;
create policy "Clients can view declines on their proposals" on public.proposal_declines
  for select using (
    proposal_id in (
      select p.id from public.proposals p
      where p.project_id in (select id from public.projects where owner_id = auth.uid())
    )
  );

create or replace function public.mark_proposal_declined()
returns trigger as $$
begin
  update public.proposals set declined_at = now() where id = new.proposal_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_mark_proposal_declined on public.proposal_declines;
create trigger trg_mark_proposal_declined
  after insert on public.proposal_declines
  for each row execute function public.mark_proposal_declined();
