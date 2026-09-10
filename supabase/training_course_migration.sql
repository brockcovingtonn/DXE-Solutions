-- =====================================================================
-- DXE Solutions — Interactive training course
--
-- Turns the existing training_steps library into a sequential course:
-- each category is a module, each module ends with a quiz, and a module
-- stays locked until the previous one's quiz is passed. Progress is
-- tracked per employee so they can resume where they left off.
--
-- The existing training_steps table and the browse view are untouched.
-- =====================================================================

-- Quiz questions, one bank per category. correct_index points into the
-- options array. Employees never read this table directly (answers would
-- leak) — the course page and grader use the service-role key.
create table if not exists public.training_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  sort_order integer not null default 0,
  question text not null,
  options jsonb not null,            -- array of 2-5 strings
  correct_index integer not null,
  created_at timestamptz default now()
);

create index if not exists training_quiz_questions_category_idx
  on public.training_quiz_questions (category, sort_order);

alter table public.training_quiz_questions enable row level security;

drop policy if exists "Admins manage quiz questions" on public.training_quiz_questions;
create policy "Admins manage quiz questions" on public.training_quiz_questions
  for all using (public.is_admin()) with check (public.is_admin());

-- Per-employee, per-module progress. One row per (employee, category).
create table if not exists public.training_course_progress (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  reviewed boolean not null default false,       -- read the section's steps
  passed boolean not null default false,         -- quiz score >= pass mark
  best_score integer,                            -- 0-100
  last_attempt_at timestamptz,
  passed_at timestamptz,
  updated_at timestamptz default now(),
  unique (employee_id, category)
);

alter table public.training_course_progress enable row level security;

drop policy if exists "Employees read own course progress" on public.training_course_progress;
create policy "Employees read own course progress" on public.training_course_progress
  for select using (employee_id = auth.uid());

drop policy if exists "Admins read all course progress" on public.training_course_progress;
create policy "Admins read all course progress" on public.training_course_progress
  for select using (public.is_admin());

-- Writes go through API routes with the service-role key (they enforce
-- the "can't skip ahead" rule), so no employee insert/update policy.
