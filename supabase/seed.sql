-- =====================================================================
-- DXE Solutions — Seed Data (Optional, for testing)
-- =====================================================================
-- Run this AFTER:
--   1. schema.sql has been executed
--   2. You've created a test user via Supabase Auth (email/password)
--
-- Steps:
--   1. Go to Authentication > Users in Supabase dashboard
--   2. Click "Add user" > Create new user
--      Email: client@demo.com / Password: demo1234 (or your choice)
--      Check "Auto Confirm User"
--   3. Copy that user's UUID (shown in the users table)
--   4. Paste it below in place of 'PASTE_USER_UUID_HERE'
--   5. Run this script in the SQL Editor
-- =====================================================================

-- Replace this with the real UUID from auth.users
-- (the trigger from schema.sql will have already created a profiles row for them)
do $$
declare
  test_user_id uuid := '05d1dd29-f406-41e2-8fad-dae82a1c8edd';
  proj1_id uuid;
  proj2_id uuid;
begin

  -- Update profile names (optional)
  update public.profiles
  set first_name = 'James', last_name = 'Harrison'
  where id = test_user_id;

  -- ---------------------------------------------------------------
  -- PROJECT 1: Calabasas Estate (active)
  -- ---------------------------------------------------------------
  insert into public.projects (
    owner_id, name, address, project_type, estimated_value,
    started_on, estimated_completion, progress_pct, status
  ) values (
    test_user_id,
    'Calabasas Estate',
    '24850 Long Valley Rd, Calabasas, CA',
    'Residential — New Construction',
    '$4.2M',
    '2024-03-12',
    '2025-12-01',
    62,
    'active'
  ) returning id into proj1_id;

  -- Phases
  insert into public.project_phases (project_id, name, pct, sort_order, state) values
    (proj1_id, 'Pre-Design', 100, 1, 'done'),
    (proj1_id, 'Permits', 100, 2, 'done'),
    (proj1_id, 'Site Work', 100, 3, 'done'),
    (proj1_id, 'Framing', 85, 4, 'active'),
    (proj1_id, 'MEP', 20, 5, 'active'),
    (proj1_id, 'Finish', 0, 6, 'pending');

  -- Milestones
  insert into public.milestones (project_id, name, display_date, state, sort_order) values
    (proj1_id, 'Project Kickoff', 'Mar 12, 2024', 'done', 1),
    (proj1_id, 'Survey & Geotech Complete', 'Apr 3, 2024', 'done', 2),
    (proj1_id, 'Permit Application Submitted', 'May 15, 2024', 'done', 3),
    (proj1_id, 'Grading Permit Approved', 'Jul 8, 2024', 'done', 4),
    (proj1_id, 'Building Permit Approved', 'Aug 22, 2024', 'done', 5),
    (proj1_id, 'Foundation Inspection Passed', 'Nov 5, 2024', 'done', 6),
    (proj1_id, 'Framing Inspection', 'Est. Aug 2025', 'active', 7),
    (proj1_id, 'MEP Rough-In Inspection', 'Est. Oct 2025', 'pending', 8),
    (proj1_id, 'Certificate of Occupancy', 'Est. Dec 2025', 'pending', 9);

  -- Activity feed
  insert into public.activity (project_id, type, text, created_at) values
    (proj1_id, 'note', 'Dixie added a note: Framing inspection scheduled for Aug 14. Contractor to have staircase complete by Aug 10.', now() - interval '2 hours'),
    (proj1_id, 'photo', '12 new progress photos added — Framing Week 8', now() - interval '1 day'),
    (proj1_id, 'doc', 'Change Order #1 uploaded — Kitchen island expansion. Review and sign required.', now() - interval '3 days'),
    (proj1_id, 'status', 'Milestone reached: Framing 85% complete', now() - interval '7 days'),
    (proj1_id, 'doc', 'Monthly progress report — June 2025 posted', '2025-06-01'),
    (proj1_id, 'note', 'Dixie added a note: HOA submitted a query on the pool equipment enclosure. Response filed, awaiting reply.', '2025-05-28');

  -- Notes
  insert into public.notes (project_id, author_name, author_role, body, created_at) values
    (proj1_id, 'Dixie — Project Manager', 'dxe', 'Framing inspection is confirmed for August 14th. Please ensure you have reviewed and signed Change Order #1 before that date — the kitchen island expansion affects the framing layout. I''ll be on-site for the inspection.', now()),
    (proj1_id, 'Dixie — Project Manager', 'dxe', 'Good news on the HOA front — their query on the pool equipment screen wall has been resolved. Approved per the revised exhibit I submitted last week. No impact to the schedule.', '2025-05-28'),
    (proj1_id, 'James Harrison', 'client', 'Thanks Dixie — what''s the status on the window delivery from Marvin? I heard from the contractor that there might be a lead time issue.', '2025-05-25'),
    (proj1_id, 'Dixie — Project Manager', 'dxe', 'Confirmed with the window supplier — Marvin has a 10-week lead on the corner units. I''ve adjusted the installation sequence to ensure we have sheathing and WRB complete before they arrive. No schedule impact.', '2025-05-26');

  -- Documents (file_path values are placeholders — real files go in Storage)
  insert into public.documents (project_id, uploaded_by_role, file_name, file_path, file_type, badge, created_at) values
    (proj1_id, 'dxe', 'Building Permit — Approved', proj1_id || '/building-permit-approved.pdf', 'pdf', 'signed', '2024-08-22'),
    (proj1_id, 'dxe', 'Grading Permit — Approved', proj1_id || '/grading-permit-approved.pdf', 'pdf', 'signed', '2024-07-08'),
    (proj1_id, 'dxe', 'Architectural Plans Rev 3', proj1_id || '/arch-plans-rev3.dwg', 'dwg', 'signed', '2024-07-01'),
    (proj1_id, 'dxe', 'Soils Report', proj1_id || '/soils-report.pdf', 'pdf', 'signed', '2024-04-03'),
    (proj1_id, 'dxe', 'HOA Approval Letter', proj1_id || '/hoa-approval.pdf', 'pdf', 'signed', '2024-09-14'),
    (proj1_id, 'dxe', 'Change Order #1 — Kitchen', proj1_id || '/change-order-1.pdf', 'pdf', 'pending', '2025-01-10'),
    (proj1_id, 'client', 'Owner Insurance Certificate', proj1_id || '/insurance-cert.pdf', 'pdf', 'signed', '2024-03-12'),
    (proj1_id, 'client', 'Lender Authorization Letter', proj1_id || '/lender-auth.pdf', 'pdf', 'signed', '2024-03-18');

  -- ---------------------------------------------------------------
  -- PROJECT 2: Westlake ADU (planning)
  -- ---------------------------------------------------------------
  insert into public.projects (
    owner_id, name, address, project_type, estimated_value,
    started_on, estimated_completion, progress_pct, status
  ) values (
    test_user_id,
    'Westlake ADU',
    '3120 Foxfield Rd, Westlake Village, CA',
    'Residential — ADU Addition',
    '$480K',
    '2025-06-03',
    '2026-05-01',
    8,
    'planning'
  ) returning id into proj2_id;

  insert into public.project_phases (project_id, name, pct, sort_order, state) values
    (proj2_id, 'Pre-Design', 100, 1, 'done'),
    (proj2_id, 'Permits', 20, 2, 'active'),
    (proj2_id, 'Site Work', 0, 3, 'pending'),
    (proj2_id, 'Framing', 0, 4, 'pending'),
    (proj2_id, 'MEP', 0, 5, 'pending'),
    (proj2_id, 'Finish', 0, 6, 'pending');

  insert into public.milestones (project_id, name, display_date, state, sort_order) values
    (proj2_id, 'Project Kickoff', 'Jun 3, 2025', 'done', 1),
    (proj2_id, 'Design Development Complete', 'Jun 28, 2025', 'active', 2),
    (proj2_id, 'Permit Application Submission', 'Est. Jul 15, 2025', 'pending', 3),
    (proj2_id, 'Permit Approval', 'Est. Oct 2025', 'pending', 4),
    (proj2_id, 'Construction Start', 'Est. Nov 2025', 'pending', 5),
    (proj2_id, 'Certificate of Occupancy', 'Est. May 2026', 'pending', 6);

  insert into public.activity (project_id, type, text, created_at) values
    (proj2_id, 'note', 'Dixie added a note: Design drawings submitted to architect for revision. Expect final set by June 28.', '2025-06-22'),
    (proj2_id, 'status', 'Project kickoff complete. Pre-design phase underway.', '2025-06-03');

  insert into public.notes (project_id, author_name, author_role, body, created_at) values
    (proj2_id, 'Dixie — Project Manager', 'dxe', 'Welcome to your client portal for the Westlake ADU project! We''re currently in design development. Once we have the final drawings, I''ll submit the permit application to LA County. Estimated 10–12 weeks for permit approval.', '2025-06-03');

  insert into public.documents (project_id, uploaded_by_role, file_name, file_path, file_type, badge, created_at) values
    (proj2_id, 'client', 'Owner-Architect Agreement', proj2_id || '/owner-architect-agreement.pdf', 'pdf', 'signed', '2025-06-03'),
    (proj2_id, 'dxe', 'Preliminary Design Drawings', proj2_id || '/prelim-design.dwg', 'dwg', 'new', '2025-06-20');

end $$;
