-- Links Design Studio quotes to a project, so a quote can show up on the
-- project page (and the client page) instead of being an island only
-- reachable from the Design Studio list. Nullable — not every quote
-- necessarily has a project yet (e.g. a lead before a project exists).
alter table public.design_studio_quotes
  add column if not exists project_id uuid references public.projects(id);

-- Backfill: a quote whose client has exactly one project gets linked
-- automatically — unambiguous. Clients with 0 or 2+ projects are left
-- null here; a one-off script resolves the 2+ case with the same
-- "most recent project" tie-break the create-quote API applies going
-- forward, so nothing stays silently unlinked.
update public.design_studio_quotes q
set project_id = p.id
from public.projects p
where q.client_id = p.owner_id
  and q.project_id is null
  and (select count(*) from public.projects p2 where p2.owner_id = q.client_id) = 1;
