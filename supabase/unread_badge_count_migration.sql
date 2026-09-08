-- =====================================================================
-- DXE Solutions — Unread Count for Push Badge
--
-- get_unread_message_counts() resolves auth.uid() from the CALLING
-- user's session, so it can't be used server-side (via the admin/
-- service-role client) to compute some OTHER user's unread count for
-- an outgoing push's aps.badge field. This mirrors the same logic,
-- parameterized by an explicit target user id instead.
--
-- Locked to service_role only — this must never be callable by an
-- ordinary authenticated user with an arbitrary target id, since that
-- would leak whether/how many unread messages another user has.
-- =====================================================================

create or replace function public.get_unread_count_for_user(p_user_id uuid)
returns bigint as $$
  select count(*)
  from public.messages m
  left join public.message_reads r
    on coalesce(r.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(m.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
   and coalesce(r.dm_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(m.dm_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
   and r.user_id = p_user_id
  where m.sender_id != p_user_id
    and m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    and (
      (m.project_id is not null and (
        exists (select 1 from public.profiles where id = p_user_id and is_admin)
        or m.project_id in (select id from public.projects where owner_id = p_user_id)
        or m.project_id in (select project_id from public.project_employees where employee_id = p_user_id)
      ))
      or (m.project_id is null and (
        exists (select 1 from public.profiles where id = p_user_id and is_admin)
        or m.dm_user_id = p_user_id
      ))
    );
$$ language sql security definer stable;

revoke execute on function public.get_unread_count_for_user(uuid) from public, anon, authenticated;
grant execute on function public.get_unread_count_for_user(uuid) to service_role;
