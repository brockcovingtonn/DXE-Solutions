import { Resend } from 'resend';

// Shared helper for sending project-update notification emails via Resend.
// Used by API routes when a client or admin makes a change that the
// other party should be notified about.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dxesolutions.com';

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Brand: navy header bar + gold accent line (matches the project cover
// sheet's letterhead), Georgia/Times as the closest email-safe stand-in
// for the site's Cormorant Garamond display serif (custom @font-face
// isn't reliably supported across email clients), Inter's system-font
// fallback stack for body copy.
const NAVY = '#3E5468';
const NAVY_DARK = '#2C3E50';
const GOLD = '#C9A857';
const CREAM = '#F6F8FA';

function wrapEmail({ heading, bodyHtml, ctaLabel, ctaUrl }) {
  const logoUrl = `${SITE_URL}/images/logo-cream.png`;

  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: ${NAVY};">
      <div style="background: ${NAVY_DARK}; padding: 22px 24px; text-align: center;">
        <img src="${logoUrl}" alt="DXE Solutions" height="30" style="height: 30px; width: auto; display: inline-block;" />
      </div>
      <div style="height: 4px; background: ${GOLD};"></div>
      <div style="padding: 28px 24px; border: 1px solid #DCE5EC; border-top: none; background: #FFFFFF;">
        <h2 style="font-family: Georgia, 'Times New Roman', serif; font-weight: 500; margin-top: 0; color: ${NAVY};">${escapeHtml(heading)}</h2>
        ${bodyHtml}
        ${
          ctaUrl
            ? `<p style="margin-top: 24px;">
                <a href="${ctaUrl}" style="display: inline-block; background: ${NAVY}; color: #FFFFFF; padding: 12px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.03em;">${escapeHtml(ctaLabel || 'View in portal')}</a>
              </p>`
            : ''
        }
      </div>
      <div style="background: ${CREAM}; padding: 14px 24px; text-align: center;">
        <p style="font-size: 0.7rem; color: #8296a6; letter-spacing: 0.04em; margin: 0;">
          DXE Solutions · Permitting &amp; Project Management
        </p>
      </div>
    </div>
  `;
}

function field(label, value) {
  return `
    <div style="margin-bottom: 12px;">
      <div style="font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: ${GOLD}; font-weight: 600; margin-bottom: 2px;">${escapeHtml(label)}</div>
      <div style="font-size: 0.92rem; color: ${NAVY};">${value}</div>
    </div>
  `;
}

/**
 * Notify Dixie of a new estimate-request submission from the public
 * "Book a 15-min call" form. Always sends, regardless of preferences —
 * this is a sales lead, not a project update.
 */
export async function notifyAdminOfEstimateRequest({
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
}) {
  const resend = getResend();
  if (!resend || !process.env.ESTIMATE_NOTIFICATION_EMAIL) return { skipped: true };

  const fullName = `${firstName}${lastName ? ` ${lastName}` : ''}`;

  const hearAboutText =
    hearAbout === 'Referral' && referralName
      ? `Referral — ${referralName}`
      : hearAbout || '';

  // projectValue/location/serviceNeeded only come from the full
  // /estimate page's longer form — the homepage's quick "Book a
  // 15-min call" form never collects them, so they're only shown here
  // when actually provided rather than always rendering "Not specified".
  const html = wrapEmail({
    heading: 'New Estimate Request',
    bodyHtml: `
      ${field('Name', escapeHtml(fullName))}
      ${field('Email', escapeHtml(email || 'Not provided'))}
      ${field('Phone', escapeHtml(phone || 'Not provided'))}
      ${field('Project Type', escapeHtml(projectType))}
      ${projectValue ? field('Estimated Value', escapeHtml(projectValue)) : ''}
      ${location ? field('Location', escapeHtml(location)) : ''}
      ${serviceNeeded ? field('Service Needed', escapeHtml(serviceNeeded)) : ''}
      ${field('Project Details', escapeHtml(details || 'None provided').replace(/\n/g, '<br/>'))}
      ${hearAboutText ? field('How They Heard About Us', escapeHtml(hearAboutText)) : ''}
    `,
  });

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: process.env.ESTIMATE_NOTIFICATION_EMAIL,
    ...(email ? { replyTo: email } : {}),
    subject: `New Estimate Request from ${fullName}`,
    html,
  });
}

/**
 * Notify the admin (Dixie) that a client did something on a project.
 * Always sends, regardless of any preference flags.
 */
export async function notifyAdminOfClientActivity({ projectName, projectId, clientName, message }) {
  const resend = getResend();
  if (!resend || !process.env.ESTIMATE_NOTIFICATION_EMAIL) return;

  const html = wrapEmail({
    heading: `Update on ${projectName}`,
    bodyHtml: `
      <p><strong>${escapeHtml(clientName)}</strong> ${escapeHtml(message)}</p>
      <p style="color: #718096; font-size: 0.85rem;">Project: ${escapeHtml(projectName)}</p>
    `,
    ctaLabel: 'View project',
    ctaUrl: `${SITE_URL}/admin/projects/${projectId}`,
  });

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.ESTIMATE_NOTIFICATION_EMAIL,
      subject: `${clientName} — ${projectName}: update`,
      html,
    });
  } catch (err) {
    console.error('notifyAdminOfClientActivity error:', err);
  }
}

/**
 * Notify the admin (Dixie) that a client paid — or attempted to pay —
 * an invoice online via Stripe.
 */
export async function notifyAdminOfInvoicePayment({ projectName, projectId, clientName, amount, method, outcome }) {
  const resend = getResend();
  if (!resend || !process.env.ESTIMATE_NOTIFICATION_EMAIL) return;

  const amountStr =
    typeof amount === 'number'
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      : amount;

  const headingByOutcome = {
    paid: `Invoice paid — ${projectName}`,
    processing: `Payment submitted (clearing) — ${projectName}`,
    failed: `Invoice payment failed — ${projectName}`,
  };

  const bodyByOutcome = {
    paid: `<p><strong>${escapeHtml(clientName)}</strong> paid <strong>${escapeHtml(amountStr)}</strong> by ${escapeHtml(method)}. The invoice is now marked paid.</p>`,
    processing: `<p><strong>${escapeHtml(clientName)}</strong> submitted a bank transfer of <strong>${escapeHtml(amountStr)}</strong>. It usually clears in a few business days — the invoice will flip to paid automatically when it does.</p>`,
    failed: `<p>A ${escapeHtml(method)} payment of <strong>${escapeHtml(amountStr)}</strong> from <strong>${escapeHtml(clientName)}</strong> failed. The invoice is still unpaid.</p>`,
  };

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.ESTIMATE_NOTIFICATION_EMAIL,
      subject: headingByOutcome[outcome] || `Invoice update — ${projectName}`,
      html: wrapEmail({
        heading: headingByOutcome[outcome] || 'Invoice update',
        bodyHtml: bodyByOutcome[outcome] || '',
        ctaLabel: 'View accounting',
        ctaUrl: `${SITE_URL}/admin/projects/${projectId}`,
      }),
    });
  } catch (err) {
    console.error('notifyAdminOfInvoicePayment error:', err);
  }
}

/**
 * Emails a finalized proposal PDF to the client (or whoever the admin
 * addressed it to). The PDF is attached directly, and the proposal is
 * also visible in the client's portal once it's finalized.
 */
export async function sendProposalEmail({ toEmail, clientName, proposalTitle, projectName, projectId, total, pdfBytes, fileName }) {
  const resend = getResend();
  if (!resend || !toEmail) return { skipped: true };

  const totalStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(total) || 0);

  const html = wrapEmail({
    heading: proposalTitle || 'Your Proposal',
    bodyHtml: `
      <p>Hi ${escapeHtml((clientName || '').split(' ')[0] || 'there')},</p>
      <p>
        Thank you for the opportunity to work with you on <strong>${escapeHtml(projectName || 'your project')}</strong>.
        Attached is our proposal covering the scope of work, pricing, and payment terms.
      </p>
      ${field('Total Proposal Price', escapeHtml(totalStr))}
      <p style="margin-top: 18px;">
        Please review the attached PDF. If everything looks good, sign and return it to move forward —
        or reply to this email with any questions and we're happy to walk through it together.
      </p>
      <p style="margin-top: 18px; color: #718096; font-size: 0.85rem;">
        You can also view this proposal anytime from your client portal.
      </p>
      <p style="margin-top: 18px;">
        We look forward to the opportunity to support your project.<br/>
        Sincerely,<br/>
        <strong>Dixie Escalante</strong><br/>
        DXE Solutions
      </p>
    `,
    ctaLabel: 'View in portal',
    ctaUrl: projectId ? `${SITE_URL}/portal/projects/${projectId}/proposals` : `${SITE_URL}/portal`,
  });

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: toEmail,
      subject: `Your DXE Solutions Proposal — ${projectName || proposalTitle || ''}`,
      html,
      attachments: [
        {
          filename: fileName || 'proposal.pdf',
          content: Buffer.from(pdfBytes).toString('base64'),
        },
      ],
    });
    if (result?.error) console.error('sendProposalEmail Resend error:', result.error);
    return result;
  } catch (err) {
    console.error('sendProposalEmail error:', err);
    return { error: true };
  }
}

/**
 * Send a client a "your portal is ready" welcome email with their
 * login email and instructions for setting a password. Never includes
 * a plaintext password — the client sets their own via the reset flow.
 */
export async function sendPortalWelcomeEmail({ clientEmail, clientName, loginEmail }) {
  const resend = getResend();
  if (!resend || !clientEmail) return { skipped: true };

  const resetUrl = `${SITE_URL}/forgot-password?email=${encodeURIComponent(loginEmail)}`;
  const loginUrl = `${SITE_URL}/login`;

  const html = wrapEmail({
    heading: 'Your client portal is ready',
    bodyHtml: `
      <p>Hi ${escapeHtml((clientName || '').split(' ')[0] || 'there')},</p>
      <p>
        Your DXE Solutions client portal has been set up. From the portal you can
        track your project's progress, view permits and documents, and message us
        directly.
      </p>
      ${field('Your login email', escapeHtml(loginEmail))}
      <p style="margin-top: 18px;">
        To set your password, click the button below and follow the link we send you.
        Once you're signed in, you can change your password anytime under
        <strong>Account Settings</strong>.
      </p>
      <p style="color: #718096; font-size: 0.85rem; margin-top: 14px;">
        Portal sign-in: <a href="${loginUrl}" style="color: ${NAVY};">${loginUrl}</a>
      </p>
    `,
    ctaLabel: 'Set your password',
    ctaUrl: resetUrl,
  });

  try {
    return await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: clientEmail,
      subject: 'Your DXE Solutions client portal is ready',
      html,
    });
  } catch (err) {
    console.error('sendPortalWelcomeEmail error:', err);
    return { error: true };
  }
}

/**
 * Notify a client that Dixie updated their project. Respects the
 * client's email_notifications preference (pass it in as a boolean).
 */
export async function notifyClientOfProjectUpdate({
  clientEmail,
  clientNotificationsEnabled,
  projectName,
  projectId,
  message,
}) {
  if (clientNotificationsEnabled === false) return;

  const resend = getResend();
  if (!resend || !clientEmail) return;

  const html = wrapEmail({
    heading: `Update on ${projectName}`,
    bodyHtml: `
      <p>${escapeHtml(message)}</p>
      <p style="color: #718096; font-size: 0.85rem;">Log in to your client portal to view details.</p>
    `,
    ctaLabel: 'View project',
    ctaUrl: `${SITE_URL}/portal/projects/${projectId}/overview`,
  });

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: clientEmail,
      subject: `DXE Solutions — ${projectName}: update`,
      html,
    });
  } catch (err) {
    console.error('notifyClientOfProjectUpdate error:', err);
  }
}

const REMINDER_LABEL = { 30: '1 month', 14: '2 weeks', 7: '1 week', 3: '3 days' };

/**
 * Reminds the admin (Dixie) that a scheduled payment milestone is
 * coming up, at T-30/14/7/3 days, asking her to confirm the project is
 * still on schedule before the invoice auto-sends to the client.
 */
export async function notifyAdminOfUpcomingPayment({ projectName, projectId, description, amount, dueDate, daysOut }) {
  const resend = getResend();
  if (!resend || !process.env.ESTIMATE_NOTIFICATION_EMAIL) return;

  const amountStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);
  const dueDateStr = new Date(`${dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const label = REMINDER_LABEL[daysOut] || `${daysOut} days`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.ESTIMATE_NOTIFICATION_EMAIL,
      subject: `Payment due in ${label} — ${projectName}`,
      html: wrapEmail({
        heading: `Payment due in ${label}`,
        bodyHtml: `
          <p>A scheduled payment on <strong>${escapeHtml(projectName)}</strong> is coming up.</p>
          ${field('Milestone', escapeHtml(description))}
          ${field('Amount', escapeHtml(amountStr))}
          ${field('Due', escapeHtml(dueDateStr))}
          <p style="margin-top: 18px; color: #718096; font-size: 0.85rem;">
            Confirm the project is still on schedule so the invoice sends to the client automatically on the due date.
            If nothing is confirmed, it will not send on its own.
          </p>
        `,
        ctaLabel: 'Confirm on schedule',
        ctaUrl: `${SITE_URL}/admin/projects/${projectId}#accounting`,
      }),
    });
  } catch (err) {
    console.error('notifyAdminOfUpcomingPayment error:', err);
  }
}

/**
 * Alerts the admin that a scheduled payment's due date arrived without
 * ever being confirmed, so the invoice was NOT auto-sent. Needs manual
 * follow-up rather than silently doing nothing.
 */
export async function notifyAdminOfUnconfirmedPayment({ projectName, projectId, description, amount, dueDate }) {
  const resend = getResend();
  if (!resend || !process.env.ESTIMATE_NOTIFICATION_EMAIL) return;

  const amountStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);
  const dueDateStr = new Date(`${dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.ESTIMATE_NOTIFICATION_EMAIL,
      subject: `Action needed — payment due today wasn't confirmed (${projectName})`,
      html: wrapEmail({
        heading: 'Payment due today — not confirmed',
        bodyHtml: `
          <p>
            A scheduled payment on <strong>${escapeHtml(projectName)}</strong> reached its due date without being confirmed,
            so the invoice was <strong>not</strong> sent to the client automatically.
          </p>
          ${field('Milestone', escapeHtml(description))}
          ${field('Amount', escapeHtml(amountStr))}
          ${field('Was due', escapeHtml(dueDateStr))}
          <p style="margin-top: 18px; color: #718096; font-size: 0.85rem;">
            Review the schedule and send the invoice manually if it's still accurate, or update the date.
          </p>
        `,
        ctaLabel: 'Review payment schedule',
        ctaUrl: `${SITE_URL}/admin/projects/${projectId}#accounting`,
      }),
    });
  } catch (err) {
    console.error('notifyAdminOfUnconfirmedPayment error:', err);
  }
}

/**
 * Sends the client the invoice that was just auto-created from a
 * confirmed payment-schedule milestone reaching its due date.
 */
export async function sendScheduledInvoiceEmail({ clientEmail, clientNotificationsEnabled, clientName, projectName, projectId, description, amount }) {
  if (clientNotificationsEnabled === false) return;

  const resend = getResend();
  if (!resend || !clientEmail) return;

  const amountStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: clientEmail,
      subject: `New invoice — ${projectName}: ${description}`,
      html: wrapEmail({
        heading: `New invoice — ${projectName}`,
        bodyHtml: `
          <p>Hi ${escapeHtml((clientName || '').split(' ')[0] || 'there')},</p>
          <p>Per your project's agreed payment schedule, a new invoice is now ready.</p>
          ${field('Milestone', escapeHtml(description))}
          ${field('Amount due', escapeHtml(amountStr))}
          <p style="margin-top: 18px; color: #718096; font-size: 0.85rem;">
            You can view and pay this invoice from your client portal.
          </p>
        `,
        ctaLabel: 'View invoice',
        ctaUrl: `${SITE_URL}/portal/projects/${projectId}/accounting`,
      }),
    });
  } catch (err) {
    console.error('sendScheduledInvoiceEmail error:', err);
  }
}
