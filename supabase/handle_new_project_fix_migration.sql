-- handle_new_project() still inserted a `status` column into
-- project_utilities, but utility_entries_migration.sql moved status
-- tracking to the new project_utility_entries table and dropped the
-- column from project_utilities. Every new project insert (both the
-- admin "add client" flow and any other project creation path) has
-- been failing since with:
--   column "status" of relation "project_utilities" does not exist
-- Restore the trigger to only insert the columns that still exist.

create or replace function public.handle_new_project()
returns trigger as $$
begin
  insert into public.project_utilities (project_id, utility_type, enabled)
  values
    (new.id, 'electrical', false),
    (new.id, 'water', false),
    (new.id, 'gas', false)
  on conflict (project_id, utility_type) do nothing;
  return new;
end;
$$ language plpgsql security definer;
