import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createClient as createSessionClient } from '@/lib/supabase-server';
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
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Resolves the signed-in staff user and their role.
 *
 * ADAPT HERE: DXE models staff as booleans on `profiles` (is_admin,
 * is_employee), not a role column. Swap this block if that ever changes;
 * nothing else in the feature reads `profiles` directly.
 */
export async function getStaffUser() {
  const session = createSessionClient();
  const { data: { user } } = await session.auth.getUser();
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

export async function requireStaff() {
  const user = await getStaffUser();
  if (!user) {
    const err = new Error('Not authorised');
    err.status = 403;
    throw err;
  }
  return user;
}

export async function requireMaster() {
  const user = await requireStaff();
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
