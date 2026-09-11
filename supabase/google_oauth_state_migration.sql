-- =====================================================================
-- DXE Solutions — Google Calendar OAuth state
--
-- Backs the "Connect Google Calendar" handshake for BOTH the web admin
-- pages (cookie session) and the native app (no cookies — its
-- ASWebAuthenticationSession can't attach an Authorization header to
-- either the outbound Google redirect or Google's own redirect back
-- into our callback). Previously /connect embedded the raw user id as
-- the OAuth `state` param and /callback re-verified it against its own
-- cookie session — that re-check is what actually provided CSRF
-- protection, since a bare user id is guessable/enumerable and isn't a
-- real nonce, and it's exactly the check that breaks with no cookies.
--
-- Correct fix: /connect mints a random single-use state row bound to
-- the caller's already-verified identity (cookie OR a token passed via
-- query string, since that's the only thing a browser-driven OAuth
-- navigation can carry), and /callback trusts that row instead of
-- needing its own session. This makes the flow work from any caller
-- and is a stronger CSRF nonce than the id-as-state scheme it replaces.
-- =====================================================================

create table if not exists public.google_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'web' check (platform in ('web', 'native')),
  created_at timestamptz not null default now()
);

-- Only ever touched via the service-role admin client from route
-- handlers — RLS enabled with no policies denies all client-side access.
alter table public.google_oauth_states enable row level security;
