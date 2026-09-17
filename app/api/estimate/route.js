import { NextResponse } from 'next/server';
import { notifyAdminOfEstimateRequest, sendEstimateConfirmationEmail } from '@/lib/email-notifications';
import { supabaseAdmin } from '@/lib/design-studio/server';
import { createLead } from '@/lib/design-studio/leads';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dxesolutions.com';

export async function POST(request) {
  try {
    const data = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      projectType,
      projectValue,
      location,
      serviceNeeded,
      details,
      hearAbout,
      referralName,
    } = data;

    // Basic validation — a caller needs a name, a project type, and some way
    // to reach them back (the hero quick-form only collects one contact
    // field, which may be an email or a phone number).
    if (!firstName || !projectType || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { error } = await notifyAdminOfEstimateRequest({
      firstName,
      lastName,
      email,
      phone,
      projectType,
      projectValue,
      location,
      serviceNeeded,
      details,
      hearAbout,
      referralName,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // Best-effort: the admin's already been notified above, which is the
    // critical path — a hiccup here shouldn't fail the whole submission.
    if (email) {
      try {
        let intakeUrl = null;
        if (projectType === 'Design Studio') {
          const lead = await createLead(supabaseAdmin(), {
            fullName: `${firstName}${lastName ? ` ${lastName}` : ''}`,
            email,
            phone,
            projectAddress: null,
          });
          intakeUrl = `${SITE_URL}/intake/${lead.token}`;
        }
        await sendEstimateConfirmationEmail({ firstName, email, intakeUrl });
      } catch (confirmationError) {
        console.error('Estimate confirmation email error:', confirmationError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Estimate API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
