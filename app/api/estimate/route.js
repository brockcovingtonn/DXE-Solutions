import { Resend } from 'resend';
import { NextResponse } from 'next/server';

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

    const resend = new Resend(process.env.RESEND_API_KEY);

    const html = `
      <h2>New Estimate Request — DXE Solutions</h2>
      <p><strong>Name:</strong> ${escapeHtml(firstName)}${lastName ? ' ' + escapeHtml(lastName) : ''}</p>
      <p><strong>Email:</strong> ${escapeHtml(email || 'Not provided')}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || 'Not provided')}</p>
      <p><strong>Project Type:</strong> ${escapeHtml(projectType)}</p>
      <p><strong>Estimated Value:</strong> ${escapeHtml(projectValue || 'Not specified')}</p>
      <p><strong>Location:</strong> ${escapeHtml(location || 'Not specified')}</p>
      <p><strong>Service Needed:</strong> ${escapeHtml(serviceNeeded || 'Not specified')}</p>
      <p><strong>Project Details:</strong></p>
      <p>${escapeHtml(details || 'None provided').replace(/\n/g, '<br/>')}</p>
    `;

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.ESTIMATE_NOTIFICATION_EMAIL,
      ...(email ? { replyTo: email } : {}),
      subject: `New Estimate Request from ${firstName}${lastName ? ' ' + lastName : ''}`,
      html,
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
