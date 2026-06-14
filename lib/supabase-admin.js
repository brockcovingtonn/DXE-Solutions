import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// This client uses the SERVICE ROLE key, which bypasses Row Level Security
// and can perform admin operations like creating new auth users.
//
// NEVER import this file into any client component or expose
// SUPABASE_SERVICE_ROLE_KEY to the browser. It should only be used
// inside API routes (app/api/**/route.js) and Server Actions.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
