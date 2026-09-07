-- =====================================================================
-- DXE Solutions — Calendar Event Types Migration
-- Run this any time after calendar_migration.sql and action_items_migration.sql.
--
-- Lets admins AND employees add calendar events (previously admin-only),
-- categorizes each event with a type, and lets one be tagged to a
-- specific employee. Picking the "Action Item" type also creates a real
-- row in action_items (linked_action_item_id) so it's tracked in both
-- places.
-- =====================================================================

alter table public.calendar_events
  add column if not exists event_type text not null default 'appointment',
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists linked_action_item_id uuid references public.action_items(id) on delete set null;

alter table public.calendar_events
  add constraint calendar_events_event_type_check
  check (event_type in ('action_item', 'appointment', 'inspection', 'meeting', 'deadline', 'other'));

-- Employees can add events to projects they're assigned to (general,
-- project-less events stay admin-only, same as today).
create policy "Employees can insert calendar events on assigned projects"
  on public.calendar_events for insert
  with check (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );

-- Lets an admin tag a specific employee on a general (no-project) event
-- and have it actually show up on that employee's calendar.
create policy "Employees can view calendar events assigned to them"
  on public.calendar_events for select
  using (assigned_to = auth.uid());

-- Needed so the "Action Item" event type can create a real, linked
-- action_items row when an employee (not just an admin) adds the event.
create policy "Employees can insert action items on assigned projects"
  on public.action_items for insert
  with check (
    project_id in (select project_id from public.project_employees where employee_id = auth.uid())
  );
