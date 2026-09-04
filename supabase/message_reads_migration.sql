-- =====================================================================
-- DXE Solutions — Message Read Receipts Migration
-- Run this any time after messages_migration.sql.
--
-- One row per (project, user) tracking when that user last read the
-- project's chat. Anyone who can read a project's messages can also see
-- everyone else's read state on that project (so a client can see "seen
-- by Dixie"), but can only ever write their own row.
-- =====================================================================

create table public.message_reads (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.message_reads enable row level security;

create policy "Admins can view all read receipts"
  on public.message_reads for select
  using (public.is_admin());

create policy "Admins can upsert their own read receipt"
  on public.message_reads for insert
  with check (public.is_admin() and user_id = auth.uid());

create policy "Admins can update their own read receipt"
  on public.message_reads for update
  using (public.is_admin() and user_id = auth.uid());

create policy "Clients can view read receipts on their projects"
  on public.message_reads for select
  using (project_id in (select id from public.projects where owner_id = auth.uid()));

create policy "Clients can insert their own read receipt"
  on public.message_reads for insert
  with check (
    user_id = auth.uid()
    and project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Clients can update their own read receipt"
  on public.message_reads for update
  using (
    user_id = auth.uid()
    and project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Employees can view read receipts on assigned projects"
  on public.message_reads for select
  using (project_id in (select project_id from public.project_employees where employee_id = auth.uid()));

create policy "Employees can insert their own read receipt"
  on public.message_reads for insert
  with check (
    user_id = auth.uid()
    and project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can update their own read receipt"
  on public.message_reads for update
  using (
    user_id = auth.uid()
    and project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

alter publication supabase_realtime add table public.message_reads;

-- ---------------------------------------------------------------------
-- Unread counts for the current session, scoped to whatever projects
-- they can already see (admin: all: client: owned; employee: assigned).
-- Used to badge "Chat" links around the app.
-- ---------------------------------------------------------------------
create or replace function public.get_unread_message_counts()
returns table (project_id uuid, unread_count bigint) as $$
  select m.project_id, count(*) as unread_count
  from public.messages m
  left join public.message_reads r
    on r.project_id = m.project_id and r.user_id = auth.uid()
  where m.sender_id != auth.uid()
    and m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    and (
      public.is_admin()
      or m.project_id in (select id from public.projects where owner_id = auth.uid())
      or m.project_id in (select project_id from public.project_employees where employee_id = auth.uid())
    )
  group by m.project_id;
$$ language sql security definer stable;
