-- Adds Notes and Time Line fields to scope_items, matching the per-item
-- tracking the admin team already keeps in their scope-of-work spreadsheets.
alter table public.scope_items add column if not exists notes text;
alter table public.scope_items add column if not exists timeline text;
