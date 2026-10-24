-- scope_items.timeline was a free-text field and has never actually
-- been used (every row in production is null or empty), so it can
-- become a real date with no data to lose — lets the field be an
-- actual target date instead of unstructured text.
alter table public.scope_items
  alter column timeline type date using (nullif(timeline, '')::date);
