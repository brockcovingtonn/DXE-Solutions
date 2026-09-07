import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Same as above
          }
        },
      },
    }
  );
}

// Route handlers only: the web app authenticates via cookies (above),
// but the native app has none — it sends its Supabase access token as a
// Bearer header instead. Resolves { supabase, user } from whichever is
// present, so an admin API route can support both without knowing which
// client it's talking to. Falls back to the normal cookie session when
// no bearer token is on the request, so existing web behavior is
// unchanged.
export async function getRequestClient(request) {
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (bearerToken) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
        auth: { persistSession: false },
      }
    );
    const { data: { user } } = await supabase.auth.getUser(bearerToken);
    return { supabase, user };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}
