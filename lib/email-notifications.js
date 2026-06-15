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

function wrapEmail({ heading, bodyHtml, ctaLabel, ctaUrl }) {
  const logoUrl = `${SITE_URL}/images/logo-gold.png`;

  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0B1F3A;">
      <div style="background: #0B1F3A; padding: 24px; text-align: center;">
        <img src="${logoUrl}" alt="DXE Solutions" height="32" style="height: 32px; width: auto; display: inline-block;" />
      </div>
      <div style="padding: 24px; border: 1px solid #eee;">
        <h2 style="font-weight: 500; margin-top: 0;">${escapeHtml(heading)}</h2>
        ${bodyHtml}
        ${
          ctaUrl
            ? `<p style="margin-top: 24px;">
                <a href="${ctaUrl}" style="display: inline-block; background: #0B1F3A; color: #C9A84C; padding: 12px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.03em;">${escapeHtml(ctaLabel || 'View in portal')}</a>
              </p>`
            : ''
        }
      </div>
      <p style="font-size: 0.75rem; color: #999; text-align: center; margin-top: 16px;">
        DXE Solutions · Build to Deliver
      </p>
    </div>
  `;
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
