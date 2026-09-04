-- =====================================================================
-- DXE Solutions — Training Migration
-- Run this any time after employee_role_migration.sql.
--
-- A simple ordered checklist of steps per project category, used to walk
-- an employee through how DXE runs a project of that type. Admins can
-- add/edit/delete; employees get read-only access to browse it. Not
-- project-scoped — this is reference material, not tied to a specific
-- project row, so every employee sees the same content regardless of
-- what they're currently assigned to.
--
-- `project_type` is either 'General' (steps that apply to every project,
-- shown alongside whichever specific category an employee is viewing)
-- or one of the values in lib/constants.js's PROJECT_TYPES.
-- =====================================================================

create table public.training_steps (
  id uuid primary key default gen_random_uuid(),
  project_type text not null,
  title text not null,
  description text,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.training_steps enable row level security;

create policy "Admins can view all training steps"
  on public.training_steps for select
  using (public.is_admin());

create policy "Admins can insert training steps"
  on public.training_steps for insert
  with check (public.is_admin());

create policy "Admins can update training steps"
  on public.training_steps for update
  using (public.is_admin());

create policy "Admins can delete training steps"
  on public.training_steps for delete
  using (public.is_admin());

create policy "Employees can view all training steps"
  on public.training_steps for select
  using (public.is_employee());

-- ---------------------------------------------------------------------
-- Seed content — the standard DXE workflow, plus what's specific to
-- each project category. Edit freely from /admin/training afterward.
-- ---------------------------------------------------------------------

insert into public.training_steps (project_type, title, description, sort_order) values

-- GENERAL — applies to every project regardless of type
('General', 'Intake call & scope confirmation', 'Confirm the address, project type, jurisdiction, and what the client actually needs before anything gets created in the system.', 1),
('General', 'Create the client & project', 'Use Admin → New Client & Project (or Add Project for an existing client). Set the correct project type so phases pre-fill correctly for that scope.', 2),
('General', 'Confirm phases match reality', 'Review the pre-filled Project Phases for the selected type and adjust names or add/remove phases if the actual scope calls for it.', 3),
('General', 'Add the project team', 'Enter the contractor, architect, and any consultants under Project Team so the client has one place to see who''s who.', 4),
('General', 'Log known permits', 'Add every permit you already know this project will need under Permits, even if its status is Not Started. It''s easier to update a row than to remember to create one later.', 5),
('General', 'Set up utilities', 'Toggle on the utility types (electrical/water/gas) that apply to this project and add the known contact for each.', 6),
('General', 'Assign employees', 'If anyone besides you will be working this project, assign them to it under Admin → Employees so it shows up on their dashboard.', 7),
('General', 'Send the welcome note', 'Post an initial note on the project welcoming the client and outlining what happens next. This is usually their first impression of the portal.', 8),
('General', 'Track action items as they come up', 'Log any task you or a teammate owes as an Action Item. Mark the ones the client should see as "visible to client."', 9),
('General', 'Keep documents current', 'Upload contracts (tagged "Contract"), plans, and correspondence as they arrive. Tag anything signed as "Signed" so the client can tell at a glance.', 10),
('General', 'Update phases and progress as work moves', 'Don''t let the client-facing progress bar go stale — move phases to active/done as they actually happen, not in a batch at the end.', 11),
('General', 'Invoice as agreed', 'Add invoices under Accounting when it''s time to bill, and mark them paid once payment clears so the client''s balance due stays accurate.', 12),
('General', 'Close out', 'Once the certificate of occupancy (or final sign-off) is in hand, mark remaining phases done, upload the final documents, and change the project status to Completed.', 13),
('General', 'Ask for a review', 'Let the client know they can leave a review from their portal at any point. Feature the good ones from Admin → Reviews so they show up on the website.', 14),

-- RESIDENTIAL — NEW CONSTRUCTION
('Residential — New Construction', 'Confirm lot/parcel details', 'Get the APN and zoning before submittal and add them to the project''s Permitting Details.', 1),
('Residential — New Construction', 'Sequence permits realistically', 'Grading typically needs to clear before building, and utility rough-in coordination usually follows permit issuance — track each permit separately with its own status rather than one combined entry.', 2),
('Residential — New Construction', 'Coordinate the site work → framing handoff', 'Confirm inspections are scheduled before the crew is ready to move to the next phase, so nobody loses a week standing around waiting on a sign-off.', 3),
('Residential — New Construction', 'Track utility installs against the framing schedule', 'Utility work often gates other inspections — keep entries current so the crew isn''t surprised by a hold.', 4),
('Residential — New Construction', 'Watch for the final-inspections cluster', 'Building, fire, and utility finals often stack up at the end of the job. Pre-walk what you can before the inspector shows up so a failed final doesn''t cost another week.', 5),

-- RESIDENTIAL — ADU
('Residential — ADU', 'Confirm ADU-specific zoning rules', 'Setbacks, size limits, and parking requirements vary by jurisdiction and change often — confirm the current local ADU ordinance before submittal, don''t assume it''s the same as last time.', 1),
('Residential — ADU', 'Check for a streamlined or ministerial review path', 'Many jurisdictions are required to fast-track ADU review. Know your city''s specific process so you can set accurate expectations with the client on timeline.', 2),
('Residential — ADU', 'Coordinate utility upgrades early', 'ADUs frequently need a separate meter or a panel upgrade. Flag this at intake so it doesn''t stall the schedule when it surfaces later.', 3),
('Residential — ADU', 'Keep the scope tight', 'ADU projects often quietly expand into a full remodel of the main house. Document scope clearly in Project Details so any expansion shows up as a visible change, not scope creep nobody agreed to.', 4),

-- RESIDENTIAL — RENOVATION / ADDITION
('Residential — Renovation / Addition', 'Get the existing conditions on file', 'Request or confirm existing plans/permits before submitting a remodel — cities frequently ask for them and it''s much easier to have them ready.', 1),
('Residential — Renovation / Addition', 'Flag structural changes early', 'Any wall removal or foundation work needs its own permit thread. Don''t let it get bundled silently into a general "Building" permit where it can get lost.', 2),
('Residential — Renovation / Addition', 'Plan for occupied-home logistics', 'Confirm with the client how utilities and access will work while the home stays occupied during construction — this is a common source of friction on remodels.', 3),

-- COMMERCIAL — NEW CONSTRUCTION
('Commercial — New Construction', 'Confirm entitlements before design finalizes', 'Zoning or use approvals often need to clear before permits can even be submitted. Track this as its own permit entry, separate from the building permit.', 1),
('Commercial — New Construction', 'Track multi-agency sign-off', 'Fire, health, and building departments often review commercial work separately. A permit entry per agency keeps status honest instead of one vague "in review" line.', 2),
('Commercial — New Construction', 'Coordinate structural inspections with the schedule', 'Commercial structural work (steel/concrete) has hard inspection windows. Confirm dates before the crew shows up, not after.', 3),
('Commercial — New Construction', 'Plan the close-out early', 'Commercial CO packages are heavier — accessibility and fire/life-safety sign-off take real time. Start the punch list conversation well before the project is actually done.', 4),

-- COMMERCIAL — TENANT IMPROVEMENT
('Commercial — Tenant Improvement', 'Confirm the base building allows the proposed use', 'An occupancy or use change can trigger a much bigger review than the client expects. Confirm with the jurisdiction before committing to a scope or a timeline.', 1),
('Commercial — Tenant Improvement', 'Sequence demo before buildout permits', 'Demo often needs its own permit and inspection before buildout can proceed. Don''t let it get bundled into the buildout permit where it''s easy to lose track of.', 2),
('Commercial — Tenant Improvement', 'Coordinate landlord/base-building approvals', 'TI work often needs sign-off from the property owner or the base-building engineer. Get this in writing before submittal, not after corrections come back.', 3),

-- MIXED-USE DEVELOPMENT
('Mixed-Use Development', 'Track each use separately', 'Residential and commercial components usually follow different code paths. Keep permits and phases distinct per use rather than one combined tracker.', 1),
('Mixed-Use Development', 'Watch for parking and shared-utility requirements', 'Mixed-use often has combined parking or shared-utility requirements that don''t map cleanly onto a single-use checklist. Confirm with the jurisdiction early rather than assuming.', 2),

-- PERMITTING (permitting-only engagement)
('Permitting', 'Confirm the exact scope of the engagement', 'Permitting-only means no active field coordination. Be explicit with the client up front about what is and isn''t included so expectations match the invoice.', 1),
('Permitting', 'Track the submittal → corrections cycle tightly', 'This cycle IS the engagement. Log every round of city comments and every response as its own Action Item so nothing sits unanswered.', 2),

-- UTILITIES (utilities-only engagement)
('Utilities', 'Confirm which utilities are actually in scope', 'Not every utilities engagement covers all three types. Set this correctly in the Utilities section so the client only sees what they''re actually paying for.', 1),
('Utilities', 'Track each work request number', 'Utility companies use their own tracking numbers. Log them in the entry as soon as they''re issued — they''re much harder to track down after the fact.', 2);
