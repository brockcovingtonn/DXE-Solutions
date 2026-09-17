import { createAdminClient } from './supabase-admin';

// Single-row site-wide settings — see supabase/site_settings_migration.sql.
// Read via the service-role client even from public pages (e.g. the
// homepage) since the row has no RLS policies of its own, same convention
// as Design Studio's tables.

export async function getSiteSettings() {
  const db = createAdminClient();
  const { data } = await db.from('site_settings').select('*').eq('id', true).maybeSingle();
  return {
    googleBookingEnabled: data?.google_booking_enabled ?? true,
  };
}

export async function setGoogleBookingEnabled(enabled) {
  const db = createAdminClient();
  const { error } = await db
    .from('site_settings')
    .upsert({ id: true, google_booking_enabled: enabled, updated_at: new Date().toISOString() });
  if (error) throw error;
}
