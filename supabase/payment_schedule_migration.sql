-- =====================================================================
-- DXE Solutions — Payment Schedule
--
-- Lets an admin lay out the agreed payment milestones for a project
-- (e.g. from a signed proposal's payment terms), see them on the
-- calendar/accounting views, and have the corresponding invoice
-- auto-created and emailed to the client on the due date — gated on an
-- explicit admin confirmation so a schedule that's since changed never
-- fires a stale invoice automatically.
--
-- Reminder cadence (T-30/14/7/3 days) is driven by pg_cron + pg_net
-- calling /api/cron/send-payment-reminders once a day, mirroring
-- calendar_reminders_migration.sql's send-calendar-reminders job.
-- =====================================================================

create table if not exists public.payment_schedule_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  description text not null,
  amount numeric not null,
  percent numeric,
  -- Nullable: some contracts price a milestone against an event
  -- ("upon utility completion") rather than a calendar date. Those
  -- are tracked here for visibility but never get reminders or an
  -- auto-sent invoice — only dated items do.
  due_date date,
  status text not null default 'scheduled' check (status in ('scheduled', 'invoiced', 'paid', 'skipped')),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  reminder_30_sent_at timestamptz,
  reminder_14_sent_at timestamptz,
  reminder_7_sent_at timestamptz,
  reminder_3_sent_at timestamptz,
  missed_alert_sent_at timestamptz,
  notes text,
  sort_order int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_schedule_items alter column due_date drop not null;

create index if not exists idx_payment_schedule_items_project on public.payment_schedule_items(project_id);
create index if not exists idx_payment_schedule_items_due_date on public.payment_schedule_items(due_date) where status = 'scheduled';

alter table public.payment_schedule_items enable row level security;

drop policy if exists "Admins manage payment schedule items" on public.payment_schedule_items;
create policy "Admins manage payment schedule items" on public.payment_schedule_items
  for all using (public.is_admin()) with check (public.is_admin());

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-payment-reminders')
where exists (select 1 from cron.job where jobname = 'send-payment-reminders');

-- Once daily at 8am Pacific (15:00 UTC during PST / 14:00 UTC during
-- PDT — 15:00 UTC is used here as the fixed baseline) so Dixie has the
-- reminder in the morning rather than mid-night.
select cron.schedule(
  'send-payment-reminders',
  '0 15 * * *',
  $$
  select net.http_post(
    url := 'https://www.dxesolutions.com/api/cron/send-payment-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer 85864c3190bb7edc5c91927e51a4523c76b65c49545ad058', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
