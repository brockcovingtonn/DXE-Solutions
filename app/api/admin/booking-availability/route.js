import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { getBookingAvailability, setBookingAvailability } from '@/lib/booking-availability';

async function requireAdmin(request) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

export async function GET(request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const config = await getBookingAvailability();
  return NextResponse.json({ config });
}

export async function PATCH(request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json();
    const patch = {};
    if (body.sessionMinutes != null) patch.session_minutes = Number(body.sessionMinutes);
    if (body.bufferMinutes != null) patch.buffer_minutes = Number(body.bufferMinutes);
    if (body.minNoticeHours != null) patch.min_notice_hours = Number(body.minNoticeHours);
    if (body.maxDaysOut != null) patch.max_days_out = Number(body.maxDaysOut);
    if (body.timezone) patch.timezone = body.timezone;
    if (body.weeklyHours) patch.weekly_hours = body.weeklyHours;
    await setBookingAvailability(patch);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Could not save availability' }, { status: 500 });
  }
}
