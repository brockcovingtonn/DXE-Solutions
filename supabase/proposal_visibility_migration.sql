-- =====================================================================
-- DXE Solutions — explicit client-visibility toggle for proposals
--
-- Previously any non-draft proposal was automatically visible in the
-- client portal. This adds an explicit visible_to_client flag (same
-- pattern as invoices) so the admin controls exactly when a client sees
-- a proposal, independent of whether it's been finalized.
-- =====================================================================

alter table public.proposals
  add column if not exists visible_to_client boolean not null default false;

-- Replace the "status <> draft" client policy with one that ALSO
-- requires the explicit flag — a draft is never client-visible
-- regardless of the flag, since the flag only controls whether a
-- finalized/sent proposal is shared.
drop policy if exists "Clients view own project proposals" on public.proposals;
create policy "Clients view own project proposals" on public.proposals
  for select using (
    status <> 'draft'
    and visible_to_client = true
    and project_id in (select id from public.projects where owner_id = auth.uid())
  );

drop policy if exists "Clients view own project proposal line items" on public.proposal_line_items;
create policy "Clients view own project proposal line items" on public.proposal_line_items
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_line_items.proposal_id
        and p.status <> 'draft'
        and p.visible_to_client = true
        and p.project_id in (select id from public.projects where owner_id = auth.uid())
    )
  );
