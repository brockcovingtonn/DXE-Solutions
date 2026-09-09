-- message_reads has been realtime-enabled since messages_migration.sql,
-- but it never had a real primary key — chat_dm_migration.sql's rework
-- and the later message_reads_fix_migration.sql only added a UNIQUE
-- constraint on nullable generated columns, which Postgres won't accept
-- as a replica identity. Any DELETE that cascades into this table
-- (e.g. deleting a profile/auth user) fails with:
--   cannot delete from table "message_reads" because it does not have
--   a replica identity and publishes deletes
-- Adding a real id primary key restores the default replica identity.

-- FULL doesn't require an index, so it unblocks the backfill below;
-- switched back to the (now real) primary key at the end.
alter table public.message_reads replica identity full;

alter table public.message_reads add column if not exists id uuid default gen_random_uuid();
update public.message_reads set id = gen_random_uuid() where id is null;
alter table public.message_reads alter column id set not null;
alter table public.message_reads add primary key (id);

alter table public.message_reads replica identity default;
