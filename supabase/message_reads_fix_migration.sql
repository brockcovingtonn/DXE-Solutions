-- =====================================================================
-- DXE Solutions — Fix message_reads upsert (badge never resets)
--
-- message_reads_unique_idx (from chat_dm_migration.sql) is an
-- EXPRESSION index — unique on (coalesce(project_id,...),
-- coalesce(dm_user_id,...), user_id) — not on plain columns. Postgres
-- can only target an expression index with ON CONFLICT if the upsert
-- re-specifies those exact expressions, which neither the web
-- (components/ChatBox.js) nor native (ChatView.swift,
-- AdminChatThreadView.swift) upsert calls ever did — they just call
-- .upsert(payload) with no onConflict at all. Every "mark as read"
-- after the very first successful one for a given thread has
-- therefore been silently failing ever since (error swallowed by
-- try?/an unchecked .then()), so last_read_at has been frozen at
-- whatever it was on the first ever read — explaining "the badge
-- never resets."
--
-- Fix: add two GENERATED STORED columns (plain columns, not
-- expressions) and put a real unique constraint on those — a normal
-- column-based constraint is something PostgREST's upsert onConflict
-- parameter can actually target correctly.
-- =====================================================================

drop index if exists message_reads_unique_idx;

alter table public.message_reads
  add column if not exists project_key uuid generated always as (coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  add column if not exists dm_key uuid generated always as (coalesce(dm_user_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored;

alter table public.message_reads
  add constraint message_reads_key_unique unique (project_key, dm_key, user_id);
