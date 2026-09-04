import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGoogleAuthUrl } from '@/lib/google-calendar';

// Redirects the admin to Google's OAuth consent screen. `state` carries
// the admin's user id through the round trip so the callback knows whose
// connection to store.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.redirect(getGoogleAuthUrl(user.id));
}
