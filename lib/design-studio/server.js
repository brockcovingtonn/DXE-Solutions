import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createClient as createSessionClient, getRequestClient } from '@/lib/supabase-server';
import { DEFAULT_CONFIG } from './pricing';

/* ============================================================
   THE ONLY FILE YOU SHOULD NEED TO ADAPT TO THE EXISTING APP.
   Everything else in this feature calls through these helpers.
   ============================================================ */

/**
 * Service-role client. Used for every read and write in this feature, which is
 * why the two studio tables ship with RLS enabled and no policies: nothing
 * reaches them except server code that has already passed requireStaff().
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Design Studio: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Next.js patches the global fetch() to cache GET requests made during
      // a Server Component render, keyed by URL. PostgREST encodes the
      // select/filter/order as query params, so the very first time a given
      // combination runs, Next caches that response — and a later request
      // with the identical filters (e.g. re-checking a row after updating a
      // boolean column) can silently come back with the old, cached result.
      // Every design-studio read is a live check against tables that change
      // between requests, so this client always opts out.
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}

/**
 * Resolves the signed-in staff user and their role.
 *
 * Pass the route's `request` from an API route so a Bearer token from the
 * native app is honored; omit it in a Server Component page, which has no
 * request object and relies on the cookie session instead.
 *
 * ADAPT HERE: DXE models staff as booleans on `profiles` (is_admin,
 * is_employee), not a role column. Swap this block if that ever changes;
 * nothing else in the feature reads `profiles` directly.
 */
export async function getStaffUser(request) {
  let user;
  if (request) {
    ({ user } = await getRequestClient(request));
  } else {
    const session = createSessionClient();
    ({ data: { user } } = await session.auth.getUser());
  }
  if (!user) return null;

  const db = supabaseAdmin();
  // ---- ADAPT: table/columns that decide who is staff ----
  const { data: profile } = await db
    .from('profiles')
    .select('id, first_name, last_name, email, is_admin, is_employee')
    .eq('id', user.id)
    .maybeSingle();
  const isMaster = !!profile?.is_admin;
  const isStaff = isMaster || !!profile?.is_employee;
  // ---------------------------------------------------------

  if (!isStaff) return null;

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();

  return {
    id: user.id,
    email: profile?.email || user.email || '',
    name: name || user.email || '',
    role: isMaster ? 'master_admin' : 'employee',
    isMaster,
  };
}

export async function requireStaff(request) {
  const user = await getStaffUser(request);
  if (!user) {
    const err = new Error('Not authorised');
    err.status = 403;
    throw err;
  }
  return user;
}

export async function requireMaster(request) {
  const user = await requireStaff(request);
  if (!user.isMaster) {
    const err = new Error('Master admin access required');
    err.status = 403;
    throw err;
  }
  return user;
}

/** Active rate card, falling back to the code defaults if none is seeded yet. */
export async function loadActiveConfig() {
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from('design_studio_config')
      .select('id, config, version, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.config) return { ...DEFAULT_CONFIG, ...data.config, _configId: data.id };
  } catch {
    /* fall through to defaults */
  }
  return { ...DEFAULT_CONFIG, _configId: null };
}

export function jsonError(err) {
  const status = err?.status || 500;
  return Response.json({ error: err?.message || 'Server error' }, { status });
}
