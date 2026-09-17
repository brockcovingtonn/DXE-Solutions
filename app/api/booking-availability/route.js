import { NextResponse } from 'next/server';
import { computeAvailableSlots, getBookingAvailability } from '@/lib/booking-availability';

export const dynamic = 'force-dynamic';

// Public — the Book-a-call slot picker. ?date=YYYY-MM-DD (a single
// calendar day, in the business's own configured timezone).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'A valid date (YYYY-MM-DD) is required' }, { status: 400 });
    }

    const result = await computeAvailableSlots({ date });
    const config = await getBookingAvailability();
    return NextResponse.json({
      ...result,
      sessionMinutes: config?.session_minutes || 15,
      timezone: config?.timezone || 'America/Los_Angeles',
      maxDaysOut: config?.max_days_out || 14,
    });
  } catch (err) {
    console.error('booking-availability error:', err);
    return NextResponse.json({ error: 'Could not load availability' }, { status: 500 });
  }
}
