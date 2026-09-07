-- =====================================================================
-- DXE Solutions — Client Activity Logging Fix
-- Run this any time.
--
-- /api/notes and /api/documents let a client post a note or upload a
-- document on their own project, then try to log it to the `activity`
-- feed and email Dixie. The activity insert has always used the
-- client's own RLS-scoped session (not a service-role client), but
-- `activity` only ever had an insert policy for admins — so every
-- client-authored note or document has been silently failing to log
-- (the route doesn't check that insert's result), even though the
-- note/document itself saved fine and Dixie's email notification still
-- went out. This adds the missing policy so the activity feed actually
-- reflects client-originated activity too.
-- =====================================================================

create policy "Clients can insert activity on their own projects"
  on public.activity for insert
  with check (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );
