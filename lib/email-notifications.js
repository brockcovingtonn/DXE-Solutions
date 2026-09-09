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
}) {
  const resend = getResend();
  if (!resend || !process.env.ESTIMATE_NOTIFICATION_EMAIL) return { skipped: true };

  const fullName = `${firstName}${lastName ? ` ${lastName}` : ''}`;

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
