import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { getSiteSettings, setGoogleBookingEnabled } from '@/lib/site-settings';

async function requireAdmin(request) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

export async function GET(request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json();
    await setGoogleBookingEnabled(Boolean(body.googleBookingEnabled));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Could not save settings' }, { status: 500 });
  }
}
