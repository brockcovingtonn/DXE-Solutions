import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { exchangeCodeForTokens, watchCalendar } from '@/lib/google-calendar';

export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${siteUrl}/admin/calendar?google=error`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_employee')
    .eq('id', user.id)
    .single();

  const calendarPath = profile?.is_admin ? '/admin/calendar' : '/employee/calendar';

  if ((!profile?.is_admin && !profile?.is_employee) || !code) {
    return NextResponse.redirect(`${siteUrl}${calendarPath}?google=error`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const admin = createAdminClient();
    await admin.from('google_calendar_connections').upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      calendar_id: 'primary',
    });

    try {
      await watchCalendar(admin, user.id);
    } catch (watchErr) {
      console.error('Google Calendar watch registration error:', watchErr);
    }

    return NextResponse.redirect(`${siteUrl}${calendarPath}?google=connected`);
  } catch (err) {
    console.error('Google Calendar connect error:', err);
    return NextResponse.redirect(`${siteUrl}${calendarPath}?google=error`);
  }
}
