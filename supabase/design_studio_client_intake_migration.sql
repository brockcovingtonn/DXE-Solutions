-- ============================================================================
-- Design Studio — client accounts + intake form
-- Run once in the Supabase SQL Editor.
--
-- client_id: links a quote to a real profiles/auth.users account, created
-- when staff picks "new client" in the quote builder. Nullable — existing
-- quotes (free-text client_name/client_email only) keep working untouched.
--
-- intake: the client's answers to the detailed intake form, keyed by the
-- field ids in lib/design-studio/intake.js. Submitted either by the client
-- via the unauthenticated /intake/[share_token] page, or filled in directly
-- by staff from the quote detail view.
-- ============================================================================

alter table public.design_studio_quotes
  add column if not exists client_id uuid references public.profiles(id),
  add column if not exists intake jsonb not null default '{}'::jsonb,
  add column if not exists intake_requested_at timestamptz,
  add column if not exists intake_submitted_at timestamptz;
