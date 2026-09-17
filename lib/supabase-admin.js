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
      global: {
        // Next.js patches the global fetch() to cache GET requests by URL
        // during a server render/route handler. PostgREST encodes the
        // select/filter/order as query params, so the first time a given
        // combination runs, Next caches that response — and a later
        // request with identical filters (e.g. re-checking a row right
        // after updating it) can silently come back with the old, cached
        // result. Every admin read here is a live check against tables
        // that change between requests, so this client always opts out.
        // (Same fix already applied to Design Studio's own service-role
        // client in lib/design-studio/server.js.)
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  );
}
