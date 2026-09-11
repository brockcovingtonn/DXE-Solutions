import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getGoogleAuthUrl } from '@/lib/google-calendar';

// Redirects to Google's OAuth consent screen. The web admin/employee
// calendar page hits this as a normal same-origin link (cookie
// session). The native app can't attach an Authorization header to a
// browser-driven OAuth navigation — ASWebAuthenticationSession only
// takes a bare URL — so it passes its Supabase access token as
// ?access_token= instead, validated the same way a Bearer header would
// be, just carried differently since headers aren't an option here.
//
// Either way, a fresh single-use state row is minted and bound to the
// caller's verified identity — see google_oauth_state_migration.sql for
// why /callback trusts that row instead of re-checking its own session.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get('access_token');

  let user = null;
  let platform = 'web';

  if (queryToken) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase.auth.getUser(queryToken);
    user = data.user;
    platform = 'native';
  } else {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, is_employee')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_employee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const state = randomBytes(24).toString('hex');
  const { error } = await admin.from('google_oauth_states').insert({ state, user_id: user.id, platform });
  if (error) return NextResponse.json({ error: 'Could not start the connection.' }, { status: 500 });

  return NextResponse.redirect(getGoogleAuthUrl(state));
}
