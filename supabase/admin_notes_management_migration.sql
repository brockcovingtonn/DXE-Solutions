-- =====================================================================
-- DXE Solutions — Admin Note Management
-- Run this AFTER email_notifications_migration.sql
--
-- Allows admins to edit and delete any note (their own or a client's),
-- needed for the "edit/delete" actions in the admin Notes & Updates UI.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'notes' and policyname = 'Admins can update all notes'
  ) then
    create policy "Admins can update all notes"
      on public.notes for update
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'notes' and policyname = 'Admins can delete all notes'
  ) then
    create policy "Admins can delete all notes"
      on public.notes for delete
      using (public.is_admin());
  end if;
end $$;
