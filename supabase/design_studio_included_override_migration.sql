-- Per-quote override of the "What is included" bullet list, independent of
-- the global rate card's serviceLevels config. Null means "use the computed
-- default from the quote's pricing" (every existing quote, unaffected).
alter table public.design_studio_quotes
  add column if not exists included_override jsonb;
