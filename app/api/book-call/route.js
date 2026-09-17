import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isSlotStillFree } from '@/lib/booking-availability';
import { createCalendarEvent } from '@/lib/calendar-events';
import { syncEventToGoogle } from '@/lib/google-calendar';
import { sendBookingConfirmationEmail } from '@/lib/email-notifications';

export const dynamic = 'force-dynamic';

// Public — actually books a slot the visitor picked from
// /api/booking-availability. Re-checks the slot is still free (the list
// they saw may be stale by a few seconds), then creates a real
// calendar_events row and pushes it to the connected admin's Google
// Calendar via the same path every other calendar event in this app uses.
export async function POST(request) {
  try {
    const body = await request.json();
    const { estimateRequestId, startTime } = body;
    if (!estimateRequestId || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = createAdminClient();
    const { data: lead } = await db.from('estimate_requests').select('*').eq('id', estimateRequestId).maybeSingle();
    if (!lead) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (lead.booked_start_time) {
      return NextResponse.json({ error: 'This request already has a booked call.' }, { status: 400 });
    }

    const { free, adminId, config, start, end } = await isSlotStillFree(startTime);
    if (!adminId || !config) {
      return NextResponse.json({ error: 'Booking is not available right now.' }, { status: 400 });
    }
    if (!free) {
      return NextResponse.json({ error: 'That time was just taken — please pick another.' }, { status: 409 });
    }

    const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'New lead';
    const { event, error } = await createCalendarEvent({
      supabase: db,
      actorId: adminId,
      payload: {
        title: `Call with ${fullName}`,
        description: lead.details || null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        allDay: false,
        eventType: 'appointment',
        assignedTo: adminId,
        guests: lead.email ? [{ email: lead.email, name: fullName }] : [],
      },
    });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const googleEventId = await syncEventToGoogle(db, adminId, event);
    if (googleEventId && googleEventId !== event.google_event_id) {
      await db.from('calendar_events').update({ google_event_id: googleEventId }).eq('id', event.id);
    }

    await db
      .from('estimate_requests')
      .update({
        booked_start_time: start.toISOString(),
        booked_end_time: end.toISOString(),
        calendar_event_id: event.id,
        google_event_id: googleEventId || null,
      })
      .eq('id', lead.id);

    if (lead.email) {
      try {
        await sendBookingConfirmationEmail({ firstName: lead.first_name, email: lead.email, startTime: start.toISOString(), timezone: config.timezone });
      } catch (emailErr) {
        console.error('Booking confirmation email error:', emailErr);
      }
    }

    return NextResponse.json({ success: true, startTime: start.toISOString(), endTime: end.toISOString() });
  } catch (err) {
    console.error('book-call error:', err);
    return NextResponse.json({ error: 'Could not book this call' }, { status: 500 });
  }
}
