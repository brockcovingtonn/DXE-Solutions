-- Adds a website column to contacts — the training content reorg
-- surfaced a number of agency portals/tools that only have a URL, no
-- phone or email, and the contacts table had nowhere to put one.

alter table public.contacts
  add column if not exists website text;
