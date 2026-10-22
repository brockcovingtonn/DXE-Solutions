-- Clients can now view (read-only) the Scope of Work checklist for their
-- own projects — they don't check items off themselves, but see progress
-- as the DXE team completes items.
create policy "Clients can view scope areas on their own projects"
  on public.scope_areas for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Clients can view scope items on their own projects"
  on public.scope_items for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );
