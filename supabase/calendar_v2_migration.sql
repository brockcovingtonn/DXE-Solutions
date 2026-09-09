-- =====================================================================
-- DXE Solutions — Calendar v2 Migration
-- Run any time after calendar_event_types_migration.sql and
-- contacts_migration.sql.
--
-- Adds:
--   1. Two-way Google Calendar sync bookkeeping (sync token + a
--      push-notification "watch" channel on google_calendar_connections).
--   2. calendar_event_guests — external email invitees on an event,
--      pushed to Google as attendees (real Google Calendar invites).
--   3. calendar_event_contacts — tags linking a DXE contact (e.g. a
--      structural engineer) to a calendar event for quick reference.
--   4. Employee update/delete on calendar_events for projects they're
--      assigned to (previously insert-only — employees could create an
--      event but never edit or delete it).
-- =====================================================================

alter table public.google_calendar_connections
  add column if not exists sync_token text,
  add column if not exists watch_channel_id text,
  add column if not exists watch_resource_id text,
  add column if not exists watch_token text,
  add column if not exists watch_expiration timestamptz;

-- ---------------------------------------------------------------------
-- Guests: real Google Calendar invitees. Synced to the event's
-- `attendees` array on Google (with sendUpdates=all so Google emails
-- them), and response_status is pulled back on incremental sync.
-- ---------------------------------------------------------------------
create table public.calendar_event_guests (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid references public.calendar_events(id) on delete cascade,
  email text not null,
  name text,
  response_status text default 'needsAction', -- needsAction | accepted | declined | tentative
  created_at timestamptz default now()
);

alter table public.calendar_event_guests enable row level security;

-- Visible to anyone who can already see the parent event — the nested
-- select on calendar_events is itself subject to calendar_events' own
-- RLS policies, so this correctly inherits admin/employee/client scoping.
create policy "View guests of visible calendar events"
  on public.calendar_event_guests for select
  using (
    exists (select 1 from public.calendar_events ce where ce.id = calendar_event_guests.calendar_event_id)
  );

create policy "Admins can manage calendar event guests"
  on public.calendar_event_guests for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Employees can manage guests on assigned-project events"
  on public.calendar_event_guests for all
  using (
    exists (
      select 1 from public.calendar_events ce
      join public.project_employees pe on pe.project_id = ce.project_id
      where ce.id = calendar_event_guests.calendar_event_id and pe.employee_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.calendar_events ce
      join public.project_employees pe on pe.project_id = ce.project_id
      where ce.id = calendar_event_guests.calendar_event_id and pe.employee_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Contact tags: internal reference only (not synced to Google) — e.g.
-- tagging the structural engineer visiting so anyone viewing the event
-- can pull up their phone/email.
-- ---------------------------------------------------------------------
create table public.calendar_event_contacts (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid references public.calendar_events(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  created_at timestamptz default now(),
  unique (calendar_event_id, contact_id)
);

alter table public.calendar_event_contacts enable row level security;

create policy "View contact tags of visible calendar events"
  on public.calendar_event_contacts for select
  using (
    exists (select 1 from public.calendar_events ce where ce.id = calendar_event_contacts.calendar_event_id)
  );

create policy "Admins can manage calendar event contact tags"
  on public.calendar_event_contacts for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Employees can manage contact tags on assigned-project events"
  on public.calendar_event_contacts for all
  using (
    exists (
      select 1 from public.calendar_events ce
      join public.project_employees pe on pe.project_id = ce.project_id
      where ce.id = calendar_event_contacts.calendar_event_id and pe.employee_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.calendar_events ce
      join public.project_employees pe on pe.project_id = ce.project_id
      where ce.id = calendar_event_contacts.calendar_event_id and pe.employee_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Employees could insert calendar events on assigned projects but never
-- update or delete them. Symmetric with the existing insert policy.
-- ---------------------------------------------------------------------
create policy "Employees can update calendar events on assigned projects"
  on public.calendar_events for update
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  )
  with check (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

create policy "Employees can delete calendar events on assigned projects"
  on public.calendar_events for delete
  using (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );
