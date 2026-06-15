-- =====================================================================
-- DXE Solutions — Email Notification Preferences
-- Run this AFTER templates_migration.sql
--
-- Adds an email_notifications flag to profiles (default true). When
-- false, the client will not receive update emails (new documents,
-- photos, notes, status changes). Admin (Dixie) always receives
-- notifications regardless of this flag.
-- =====================================================================

alter table public.profiles
  add column if not exists email_notifications boolean default true;
