-- =====================================================================
-- DXE Solutions — Project Permitting Fields Migration
-- Run this any time after schema.sql. Adds the parcel/permitting detail
-- fields needed on the project cover sheet.
-- =====================================================================

alter table public.projects
  add column if not exists apn text,               -- Assessor's Parcel Number
  add column if not exists jurisdiction text,       -- e.g. "City of Los Angeles", "Ventura County"
  add column if not exists zoning text,             -- e.g. "R-1", "C-2"
  add column if not exists lot_size text,           -- e.g. "6,500 sq ft"
  add column if not exists building_size text,      -- e.g. "3,200 sq ft"
  add column if not exists permit_number text;      -- primary permit / plan check / case number
