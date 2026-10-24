-- A single cover photo for the project, shown in the Project details
-- card on the Overview tab — separate from the full progress-photo
-- gallery (the `photos` table, shown in the Media tab). Stored in the
-- same `project-photos` storage bucket as those, just a direct path on
-- the project row instead of its own table since there's only ever one.
alter table public.projects
  add column if not exists cover_photo_path text;
