import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGoogleAuthUrl } from '@/lib/google-calendar';

// Redirects the admin or employee to Google's OAuth consent screen.
// `state` carries the user's id through the round trip so the callback
// knows whose connection to store. Each user gets their own connection
// — an employee's events sync to their own Google Calendar if they've
// connected one, same as an admin's.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_employee')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_employee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.redirect(getGoogleAuthUrl(user.id));
}
