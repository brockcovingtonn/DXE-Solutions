import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { exchangeCodeForTokens, watchCalendar } from '@/lib/google-calendar';

const NATIVE_CALLBACK_SCHEME = 'dxesolutions://google-calendar';
const STATE_TTL_MS = 10 * 60 * 1000;

// Google redirects here after the consent screen. This can't rely on a
// cookie session — Google's own redirect can't carry an Authorization
// header any more than our outbound redirect to Google could — so
// identity comes entirely from looking up the single-use `state` row
// /connect minted for this exact caller. Deleting it on lookup makes a
// replayed callback (or a stale one past its TTL) fail closed.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const admin = createAdminClient();

  function fail(platform, path) {
    return platform === 'native'
      ? NextResponse.redirect(`${NATIVE_CALLBACK_SCHEME}?status=error`)
      : NextResponse.redirect(`${siteUrl}${path}?google=error`);
  }

  if (!state || !code) {
    return fail('web', '/admin/calendar');
  }

  const { data: stateRow } = await admin
    .from('google_oauth_states')
    .delete()
    .eq('state', state)
    .select('user_id, platform, created_at')
    .maybeSingle();

  if (!stateRow || Date.now() - new Date(stateRow.created_at).getTime() > STATE_TTL_MS) {
    return fail(stateRow?.platform || 'web', '/admin/calendar');
  }

  const { user_id: userId, platform } = stateRow;

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, is_employee')
    .eq('id', userId)
    .single();

  const calendarPath = profile?.is_admin ? '/admin/calendar' : '/employee/calendar';

  if (!profile?.is_admin && !profile?.is_employee) {
    return fail(platform, calendarPath);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await admin.from('google_calendar_connections').upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      calendar_id: 'primary',
    });

    try {
      await watchCalendar(admin, userId);
    } catch (watchErr) {
      console.error('Google Calendar watch registration error:', watchErr);
    }

    return platform === 'native'
      ? NextResponse.redirect(`${NATIVE_CALLBACK_SCHEME}?status=connected`)
      : NextResponse.redirect(`${siteUrl}${calendarPath}?google=connected`);
  } catch (err) {
    console.error('Google Calendar connect error:', err);
    return fail(platform, calendarPath);
  }
}
