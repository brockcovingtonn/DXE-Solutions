import { NextResponse } from 'next/server';
import { notifyAdminOfEstimateRequest } from '@/lib/email-notifications';

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Estimate API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
