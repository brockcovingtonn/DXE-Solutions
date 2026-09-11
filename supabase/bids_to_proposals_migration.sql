-- =====================================================================
-- DXE Solutions — rename Bids to Proposals + align content with DXE's
-- actual proposal-letter format
--
-- "Bid" was the working name during development; DXE's real documents
-- call this a Proposal, so this renames the tables/bucket/policies and
-- adds the two fields (intro_paragraph, limitations) needed to render
-- the full cover-letter-style document instead of a bare price sheet.
-- No data existed in these tables yet, so this is a clean rename.
-- =====================================================================

alter table public.bids rename to proposals;
alter table public.bid_line_items rename to proposal_line_items;
alter table public.proposal_line_items rename column bid_id to proposal_id;

alter index if exists bids_project_id_idx rename to proposals_project_id_idx;
alter index if exists bid_line_items_bid_id_idx rename to proposal_line_items_proposal_id_idx;
alter index if exists bid_line_items_category_idx rename to proposal_line_items_category_idx;

alter table public.proposals
  add column if not exists intro_paragraph text,
  add column if not exists limitations text;

drop policy if exists "Admins manage bids" on public.proposals;
create policy "Admins manage proposals" on public.proposals
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage bid line items" on public.proposal_line_items;
create policy "Admins manage proposal line items" on public.proposal_line_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Clients can see their own project's proposals once they're no longer
-- a draft — this is the new "Proposals" tab in the client portal.
drop policy if exists "Clients view own project proposals" on public.proposals;
create policy "Clients view own project proposals" on public.proposals
  for select using (
    status <> 'draft'
    and project_id in (select id from public.projects where owner_id = auth.uid())
  );

drop policy if exists "Clients view own project proposal line items" on public.proposal_line_items;
create policy "Clients view own project proposal line items" on public.proposal_line_items
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_line_items.proposal_id
        and p.status <> 'draft'
        and p.project_id in (select id from public.projects where owner_id = auth.uid())
    )
  );

-- Storage: rename the bucket (it's empty — swap id/name directly rather
-- than migrate objects) and its policies.
update storage.buckets set id = 'project-proposals', name = 'project-proposals' where id = 'project-bids';
insert into storage.buckets (id, name, public)
  values ('project-proposals', 'project-proposals', false)
  on conflict (id) do nothing;

drop policy if exists "Admins manage bid pdfs" on storage.objects;
create policy "Admins manage proposal pdfs" on storage.objects
  for all using (bucket_id = 'project-proposals' and public.is_admin())
  with check (bucket_id = 'project-proposals' and public.is_admin());

drop policy if exists "Clients read own proposal pdfs" on storage.objects;
create policy "Clients read own proposal pdfs" on storage.objects
  for select using (
    bucket_id = 'project-proposals'
    and exists (
      select 1 from public.projects p
      where p.id::text = split_part(storage.objects.name, '/', 1)
        and p.owner_id = auth.uid()
    )
  );
