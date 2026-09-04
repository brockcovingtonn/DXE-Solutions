-- =====================================================================
-- DXE Solutions — Client Portal Onboarding Tour
-- Run this any time.
--
-- Tracks whether a client has been shown the first-login walkthrough of
-- the portal. No new RLS policy is needed — profiles already has a
-- "Users can update their own profile" policy, so the tour component
-- can flip this off/on directly from the browser like the rest of
-- Account Settings does.
-- =====================================================================

alter table public.profiles
  add column if not exists has_seen_portal_tour boolean not null default false;
