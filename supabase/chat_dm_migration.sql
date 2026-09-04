-- =====================================================================
-- DXE Solutions — Direct Message Chat Migration
-- Run this any time after message_reads_migration.sql.
--
-- Adds direct-message threads alongside the existing per-project group
-- threads. A DM thread has project_id = null and dm_user_id set to
-- whichever client or employee it's with — admin is implicitly the
-- other side of every DM thread, so no admin id needs to be recorded.
-- This is what powers "client chats only with admin" and "employee
-- picks a project, or Dixie" in the floating chat widget.
-- =====================================================================

alter table public.messages
  add column if not exists dm_user_id uuid references public.profiles(id);

-- Clients: DM thread with admin (their own thread only)
create policy "Clients can view their own DM thread"
  on public.messages for select
  using (project_id is null and dm_user_id = auth.uid());

create policy "Clients can insert their own DM thread"
  on public.messages for insert
  with check (sender_id = auth.uid() and project_id is null and dm_user_id = auth.uid());

-- Employees: DM thread with admin (their own thread only)
create policy "Employees can view their own DM thread"
  on public.messages for select
  using (project_id is null and dm_user_id = auth.uid());

create policy "Employees can insert their own DM thread"
  on public.messages for insert
  with check (sender_id = auth.uid() and project_id is null and dm_user_id = auth.uid());

-- (Admins already have blanket select/insert policies from
-- messages_migration.sql that cover DM rows too — no change needed.)

-- ---------------------------------------------------------------------
-- message_reads: rework the key so it can track read-state for a DM
-- thread (project_id null) as well as a project thread.
-- ---------------------------------------------------------------------
alter table public.message_reads drop constraint if exists message_reads_pkey;
alter table public.message_reads alter column project_id drop not null;
alter table public.message_reads add column if not exists dm_user_id uuid references public.profiles(id);

create unique index if not exists message_reads_unique_idx on public.message_reads (
  coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(dm_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  user_id
);

create policy "Clients can view their DM read receipts"
  on public.message_reads for select
  using (dm_user_id = auth.uid());

create policy "Clients can upsert their DM read receipt"
  on public.message_reads for insert
  with check (user_id = auth.uid() and dm_user_id = auth.uid());

create policy "Clients can update their DM read receipt"
  on public.message_reads for update
  using (user_id = auth.uid() and dm_user_id = auth.uid());

create policy "Employees can view their DM read receipts"
  on public.message_reads for select
  using (dm_user_id = auth.uid());

create policy "Employees can upsert their DM read receipt"
  on public.message_reads for insert
  with check (user_id = auth.uid() and dm_user_id = auth.uid());

create policy "Employees can update their DM read receipt"
  on public.message_reads for update
  using (user_id = auth.uid() and dm_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Unread counts, reworked to also return DM threads (project_id null,
-- dm_user_id set). Admins get one row per project AND one row per
-- distinct client/employee who has an open DM with them.
-- ---------------------------------------------------------------------
drop function if exists public.get_unread_message_counts();

create or replace function public.get_unread_message_counts()
returns table (project_id uuid, dm_user_id uuid, unread_count bigint) as $$
  select m.project_id, m.dm_user_id, count(*) as unread_count
  from public.messages m
  left join public.message_reads r
    on coalesce(r.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(m.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
   and coalesce(r.dm_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(m.dm_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
   and r.user_id = auth.uid()
  where m.sender_id != auth.uid()
    and m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    and (
      (m.project_id is not null and (
        public.is_admin()
        or m.project_id in (select id from public.projects where owner_id = auth.uid())
        or m.project_id in (select project_id from public.project_employees where employee_id = auth.uid())
      ))
      or (m.project_id is null and (public.is_admin() or m.dm_user_id = auth.uid()))
    )
  group by m.project_id, m.dm_user_id;
$$ language sql security definer stable;
