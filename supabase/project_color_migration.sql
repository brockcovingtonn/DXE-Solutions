-- =====================================================================
-- DXE Solutions — per-project color tag for the calendar
--
-- Lets an admin tag a calendar event to a project and have that project
-- render with a consistent color across the calendar. Existing projects
-- are auto-assigned a color from a fixed palette (by creation order) so
-- nothing starts blank; new projects get assigned one on insert.
-- =====================================================================

alter table public.projects
  add column if not exists color text;

-- Fixed palette, cycled by creation order for projects that don't have
-- a color yet. Kept in sync with PROJECT_COLOR_PALETTE in lib/constants.js.
with palette(hex) as (
  values ('#3E5468'), ('#C9A857'), ('#8E6C88'), ('#5B8266'),
         ('#B5654A'), ('#4A7A8C'), ('#9C5B5B'), ('#6B7A4A')
),
ordered as (
  select id, row_number() over (order by created_at) - 1 as rn
  from public.projects
  where color is null
)
update public.projects p
set color = palette.hex
from ordered, palette
where p.id = ordered.id
  and palette.hex = (select hex from palette offset (ordered.rn % 8) limit 1);

-- Auto-assign a color to new projects that don't specify one, cycling
-- through the same 8-color palette by project count.
create or replace function public.assign_project_color()
returns trigger as $$
declare
  palette text[] := array['#3E5468', '#C9A857', '#8E6C88', '#5B8266',
                           '#B5654A', '#4A7A8C', '#9C5B5B', '#6B7A4A'];
  n int;
begin
  if new.color is null then
    select count(*) into n from public.projects;
    new.color := palette[(n % 8) + 1];
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assign_project_color on public.projects;
create trigger trg_assign_project_color
  before insert on public.projects
  for each row execute function public.assign_project_color();
