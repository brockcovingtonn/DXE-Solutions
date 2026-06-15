-- =====================================================================
-- DXE Solutions — Admin Utilities Function
-- Run this AFTER utility_entries_migration.sql
--
-- Adds get_project_utilities_admin(), which returns the same shape as
-- get_project_utilities() but includes the admin-only fields
-- (contact_comments on the utility, and action_step/comments on each
-- entry). Restricted to admins only.
-- =====================================================================

create or replace function public.get_project_utilities_admin(p_project_id uuid)
returns table (
  id uuid,
  project_id uuid,
  utility_type text,
  enabled boolean,
  contact_trade text,
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_comments text,
  entries jsonb
) as $$
  select
    u.id, u.project_id, u.utility_type, u.enabled,
    u.contact_trade, u.contact_name, u.contact_phone, u.contact_email,
    u.contact_comments,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'application', e.application,
            'work_request_number', e.work_request_number,
            'status', e.status,
            'action_step', e.action_step,
            'comments', e.comments
          )
          order by e.sort_order
        )
        from public.project_utility_entries e
        where e.utility_id = u.id
      ),
      '[]'::jsonb
    ) as entries
  from public.project_utilities u
  where u.project_id = p_project_id
    and public.is_admin();
$$ language sql security definer stable;
