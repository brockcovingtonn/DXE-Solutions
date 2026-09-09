-- =====================================================================
-- DXE Solutions — Training Content Reorganization
-- Run once, after training_master_guide_migration.sql.
--
-- The "General" category had become a 64-row dumping ground (14
-- original onboarding-SOP steps + 50 rows imported from the Master
-- Guide PDF, never sorted into anything). This splits it into six
-- purpose-built categories, moves "The Process — 16 Phase Overview" to
-- lead the whole list, appends "If You Fail to Plan, You Plan to Fail"
-- to the end of the daily-workflow SOP, retitles two steps for
-- DWP -> LADWP naming consistency, strips a shared portal login
-- credential out of the Pasadena step (credentials don't belong in
-- training content), and removes the "Grading Bond Contact" step
-- entirely — it was bare contact info with no procedural content, now
-- a real row in the contacts table instead.
--
-- lib/constants.js's TRAINING_CATEGORIES must match this category set
-- (already updated in the same commit as this migration).
-- =====================================================================

-- Process Overview
update public.training_steps set project_type = 'Process Overview', sort_order = 1 where id = '1f6e21f8-1b5f-49f0-b9ce-c5fe1de710fb';

-- Client Onboarding & Workflow
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 1 where id = '630a2a05-3731-43d3-80af-d900730bf779';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 2 where id = 'c360daed-3d3e-44a7-b6ec-751e68567f4e';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 3 where id = '9ec995d1-81f4-4d69-9702-6a6c64aeab66';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 4 where id = 'a88ea380-202d-4f16-9311-b43dd1443b5a';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 5 where id = '735d13a6-0cf1-4b8c-a499-008130bbf509';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 6 where id = '9d05cdc4-bf03-4b43-ad2f-e39b6635c538';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 7 where id = '67d5e300-2b76-4e4e-ae67-1413fa26d96c';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 8 where id = 'd85437bd-3afc-4d5f-9c26-f07f79783ea1';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 9 where id = '2cd491f0-aa92-464f-85f9-2e4ce032aed1';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 10 where id = '41833e80-fd58-4d9e-a060-36b80154dc9b';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 11 where id = '1d244bb8-ffd9-4a5d-8d49-bac238ea96c2';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 12 where id = 'a1954e9c-8bce-4038-a87b-8031a6e5974b';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 13 where id = 'bd994a68-6ed5-4ae2-a4dc-12f76cf4261a';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 14 where id = '57321405-5dd6-4e8a-a6de-dc5a1f199256';
update public.training_steps set project_type = 'Client Onboarding & Workflow', sort_order = 15 where id = 'ef59a678-057b-40fb-a4ad-ddcfb321ad93';

-- Construction Phase Guide
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 1 where id = 'db28ea8b-e4bd-4a13-973b-588e7477c27e';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 2 where id = 'eacdb935-a7c3-432b-af7a-b4a55e97712f';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 3 where id = 'd2f5a3b1-05cb-44fc-a1f8-7f7153d3cc51';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 4 where id = 'f8093890-273f-4610-b869-6b3d8a88522e';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 5 where id = 'd961dc04-4bd1-407a-8802-4720b3eacbb7';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 6 where id = '5a0007b9-3b31-4144-8eef-5f45fa4aae41';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 7 where id = 'e6cddfd2-9d5d-47ec-b2b8-e262c8b6269d';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 8 where id = 'bb7a1036-a72b-4770-b651-661fbc779861';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 9 where id = '56449b58-7754-45e3-b79f-eccdad5ae2fc';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 10 where id = '94598803-2321-4c5d-918a-52fc2c9965f7';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 11 where id = 'cca50b24-f0e7-4e64-9e8c-bf4f8a38bc9f';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 12 where id = '646f6a20-62a4-4905-bbf4-e6c509e4e28c';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 13 where id = '028c66a2-64b3-4044-8a85-f591361b707c';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 14 where id = '30a07589-1a7a-4c2b-b506-48c0bedfd550';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 15 where id = 'faba8514-45d7-47c5-ae93-2e0f848213c5';
update public.training_steps set project_type = 'Construction Phase Guide', sort_order = 16 where id = 'f1302042-d159-484b-9d62-66837086774e';

-- Permitting (appended after the 2 existing scope-setting steps, sort_order 1-2)
update public.training_steps set project_type = 'Permitting', sort_order = 3 where id = 'c3135e56-0624-4b21-87a3-2a3a6b3d2904';
update public.training_steps set project_type = 'Permitting', sort_order = 4 where id = '4d53acb6-e9f8-4b49-8c78-a972c6b37503';
update public.training_steps set project_type = 'Permitting', sort_order = 5 where id = 'f6de5aa4-52e1-4001-8992-5a8113b58380';
update public.training_steps set project_type = 'Permitting', sort_order = 6 where id = '489b6402-33c3-44e1-9dca-93c1883b57d5';
update public.training_steps set project_type = 'Permitting', sort_order = 7 where id = '55d2dd05-a448-459f-8c1b-29ccf2ba8cae';
update public.training_steps set project_type = 'Permitting', sort_order = 8 where id = '0cc8c734-d5d7-4a37-9cbc-413f0789b947';
update public.training_steps set project_type = 'Permitting', sort_order = 9 where id = 'edef0318-f5a4-4636-acb6-90ce37ba9786';
update public.training_steps set project_type = 'Permitting', sort_order = 10 where id = 'b79bfdea-f867-4281-beaf-b0126188e06d';
update public.training_steps set project_type = 'Permitting', sort_order = 11 where id = 'd0f115fc-3d5a-422e-aa8f-ad90eb199490';
update public.training_steps set project_type = 'Permitting', sort_order = 12 where id = 'f8c20b79-8072-4ce4-b3f5-99e86b17b0f3';
update public.training_steps set project_type = 'Permitting', sort_order = 13 where id = 'cd5d4eb5-aef5-44e4-ba16-e1dd21ad8923';
update public.training_steps set project_type = 'Permitting', sort_order = 14 where id = '2427347b-4256-4894-a835-5e7b616c8b76';
update public.training_steps set project_type = 'Permitting', sort_order = 15 where id = '0ce574d9-97e6-41ec-9bf6-a7a13245dfaf';

-- Utilities (appended after the 2 existing scope-setting steps, sort_order 1-2)
update public.training_steps set project_type = 'Utilities', sort_order = 3 where id = '4843c43b-8516-4389-a36b-a145b03ae1f7';
update public.training_steps set project_type = 'Utilities', sort_order = 4 where id = '807d6a4f-1b20-4350-86b4-8a051f9a4575';
update public.training_steps set project_type = 'Utilities', sort_order = 5 where id = '4a2be926-bc46-4a8f-8f29-12adad56417e';
update public.training_steps set project_type = 'Utilities', sort_order = 6 where id = '26f27546-f2d0-4dc4-b9f4-ff884d445ad2';
update public.training_steps set project_type = 'Utilities', sort_order = 7 where id = '35816a9c-51c7-4fd3-9ba3-7df2a0d15d6b';
update public.training_steps set project_type = 'Utilities', sort_order = 8 where id = '169736c7-481b-4e1e-8cc7-2a8cdc2a9912';
update public.training_steps set project_type = 'Utilities', sort_order = 9 where id = 'a9a76254-b15b-4733-a1ca-3933ea73ad4c';
update public.training_steps set project_type = 'Utilities', sort_order = 10 where id = '05d9b58c-7149-4f96-99ba-39b4c0b63ce2';
update public.training_steps set project_type = 'Utilities', sort_order = 11 where id = '0200f10f-ca6a-49d0-b59f-2bae72e57c6e';
update public.training_steps set project_type = 'Utilities', sort_order = 12 where id = '75f277b7-6716-4e06-aaf5-6dc7fe0eba9b';
update public.training_steps set project_type = 'Utilities', sort_order = 13 where id = '91050ce9-13c6-4eb0-a3d2-7ef447e0e15a';
update public.training_steps set project_type = 'Utilities', sort_order = 14 where id = '000d030f-d56c-4fbe-805f-9c5d0e678748';
update public.training_steps set project_type = 'Utilities', sort_order = 15 where id = 'fd0f7136-4d84-4dbe-bd95-ff45347131f6';

-- City & Agency Portals
update public.training_steps set project_type = 'City & Agency Portals', sort_order = 1 where id = '219ff8c2-aa0d-41e4-bc1d-1c6b661a23d6';
update public.training_steps set project_type = 'City & Agency Portals', sort_order = 2 where id = 'c7330d31-c083-4f47-93be-208b3044a061';
update public.training_steps set project_type = 'City & Agency Portals', sort_order = 3 where id = '480398b5-84c6-4e44-9590-77016ccfedb5';
update public.training_steps set project_type = 'City & Agency Portals', sort_order = 4 where id = '93570178-bc3e-4910-a422-faa65f8c21da';
update public.training_steps set project_type = 'City & Agency Portals', sort_order = 5 where id = '6edf13f4-e895-4669-bcc1-c342cc9bb3b0';

-- Bare contact info, not a training step — see contacts insert below.
delete from public.training_steps where id = '9ba921b7-d1df-400c-b776-5c77c866f722';

-- Title consistency: DWP -> LADWP
update public.training_steps set title = 'LADWP Links' where id = '4a2be926-bc46-4a8f-8f29-12adad56417e';
update public.training_steps set title = 'LADWP — Electrical Service Removal / Overhead Wire' where id = '26f27546-f2d0-4dc4-b9f4-ff884d445ad2';

-- Strip the shared portal login credential out of the Pasadena step.
update public.training_steps
set description = replace(
  description,
  'Or: https://epicla.lacounty.gov/energov_prod/selfservice — Login: Hfconst@yahoo.com / PW: SQConstruction2231',
  'Or: https://epicla.lacounty.gov/energov_prod/selfservice (ask Dixie for the login)'
)
where id = 'c7330d31-c083-4f47-93be-208b3044a061';

-- ---------------------------------------------------------------------
-- Contacts extracted from the training content — every phone number,
-- email, and website that was buried in prose, given its own record.
-- ---------------------------------------------------------------------
insert into public.contacts (name, company, trade, phone, email, website, notes) values
  ('Grading Bond', null, 'Bonding / Surety', '818-881-1011', null, null, null),
  ('LADBS — Plan Review Call Center', 'LADBS', 'Building Department / Plan Checker', '213-473-3231', null, 'https://www.ladbs.org/', null),
  ('LADBS — Plan Review IT Support', 'LADBS', 'Building Department / Plan Checker', '213-275-3434', null, null, null),
  ('LADBS — A-Permit Inspection Scheduling', 'LADBS', 'Building Inspector', '213-485-5080', null, 'https://bcainspection.lacity.org/bcaapp/scheduling', null),
  ('LADBS — Building Permit Status Lookup', 'LADBS', 'Building Department / Plan Checker', null, null, 'https://www.ladbsservices2.lacity.org/OnlineServices/?service=plr', null),
  ('LADWP — Connection Center', 'LADWP', 'Utility Company', '213-367-6937', null, null, null),
  ('LADWP — Customer Service Center', 'LADWP', 'Utility Company', '800-342-5397', null, null, 'Meter/service removal and account closeout (1-800-DIAL-DWP).'),
  ('LADWP — Power New Business (North of Mulholland)', 'LADWP', 'Utility Company', null, 'PowerNewBusinessVSP@ladwp.com', null, null),
  ('LADWP — Power New Business (South of Mulholland)', 'LADWP', 'Utility Company', null, 'PowerNewBusinessMSP@ladwp.com', null, null),
  ('LADWP Construction — Palms District', 'LADWP', 'Utility Company', '213-367-5500', null, null, null),
  ('LADWP Construction — Central District', 'LADWP', 'Utility Company', '213-367-6321', null, null, null),
  ('LADWP — Service Planning', 'LADWP', 'Utility Company', '213-367-6000', null, null, null),
  ('LADWP — Water New Business', 'LADWP', 'Utility Company', '213-367-2130', null, null, null),
  ('DigAlert', null, 'City / County Services', '800-422-4133', null, null, 'Or dial 811.'),
  ('LA Parking Enforcement (Tow Request)', null, 'City / County Services', '213-485-4184', null, null, null),
  ('Porta Kan (Temp Power Pole Rental)', null, 'Equipment Rental / Vendor', '562-463-8282', 'portakansiteservices@gmail.com', null, null),
  ('Bureau of Contract Administration (BCA)', null, 'City / County Services', '213-847-1922', 'BCA.Webmaster@lacity.org', 'https://bca.lacity.org/dispatch', '1149 S. Broadway Suite 300, Los Angeles, CA 90015. Handles S-Permit dispatch.'),
  ('Bureau of Engineering (BOE)', null, 'Building Department / Plan Checker', null, 'eng.lapermits@lacity.org', 'https://engineering.lacity.gov/permits', null),
  ('LA Parks & Rec — Park Fees', null, 'City / County Services', '213-202-2682', 'rap.parkfees@lacity.org', null, null),
  ('LA Sanitation — LID Program', null, 'City / County Services', null, null, 'https://lid.lacitysan.org/', null),
  ('Navigate LA', null, 'City / County Services', null, null, 'https://navigatela.lacity.org/navigatela/', 'Tool for determining project clearances.'),
  ('LADOT', null, 'City / County Services', null, null, 'https://ladot.lacity.gov/businesses/traffic-engineering-design-plans', null),
  ('Southern California Edison (SCE)', null, 'Utility Company', '800-655-4555', null, 'https://projectportal.sce.com/activity-submit/wfi/36998/4#Submitter', null),
  ('SoCalGas — Builder Services', null, 'Utility Company', null, null, 'https://www.socalgas.com/business/builder-services', null),
  ('City of Alhambra — Building & Safety', null, 'Building Department / Plan Checker', null, null, 'https://www.cityofalhambra.org/192/Building-Division', null),
  ('City of Pasadena — Ariana (CofO Applications)', 'City of Pasadena', 'Building Department / Plan Checker', '626-744-6903', 'aechaveste@cityofpasadena.net', null, null),
  ('City of Pasadena — Harry (Bldg Inspector Supervisor)', 'City of Pasadena', 'Building Inspector', '626-744-4204', 'aitchyan@cityofpasadena.net', null, null),
  ('City of Pasadena — Utilities Service Planning', 'City of Pasadena', 'Utility Company', '626-744-4495', null, null, 'Option 1: Electrical, Option 2: Water.'),
  ('City of South Pasadena — Building Inspection Requests', null, 'Building Department / Plan Checker', null, null, 'https://forms.office.com/pages/responsepage.aspx?id=193mw8R0a0arI5O2DdY0cFwCCYhwLEBBoALOxSlNp51URTFGT0hQOERIWllGUVQzRUxQV0NSNE8zQi4u&route=shorturl', null),
  ('City of Long Beach — Building & Safety Bureau', null, 'Building Department / Plan Checker', '562-570-7648', null, null, 'Permit Center, 411 W. Ocean Blvd., 2nd Floor, Long Beach, CA 90802.'),
  ('myLA311', null, 'City / County Services', null, null, 'https://myla311.lacity.org/portal/faces/home', 'Check Urban Forest Tree Permit status.');
