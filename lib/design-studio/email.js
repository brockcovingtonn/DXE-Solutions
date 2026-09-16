import { Resend } from 'resend';
import { BRAND } from './brand';

// Self-contained rather than importing lib/email-notifications.js's private
// helpers — keeps this feature's "strip it out to move it" story intact.
// Visual style (navy header, gold accent) still matches the rest of the
// platform's email templates.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dxesolutions.com';
const NAVY = '#3E5468';
const NAVY_DARK = '#2C3E50';
const GOLD = '#C9A857';
const CREAM = '#F6F8FA';

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

function money(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);
}

/**
 * Builds {to, subject, html, proposalUrl} for a quote's proposal email.
 * Used for both the staff preview (no send) and the actual send, so what
 * gets approved is exactly what goes out.
 */
export function buildProposalEmail(quote) {
  const to = quote.client_email || '';
  const firstName = (quote.client_name || '').split(' ')[0] || 'there';
  const proposalUrl = `${SITE_URL}/proposal/${quote.share_token}`;
  const subject = `Your ${BRAND.name} Proposal — ${quote.quote_number}`;

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: ${NAVY};">
      <div style="background: ${NAVY_DARK}; padding: 22px 24px; text-align: center;">
        <img src="${SITE_URL}/images/logo-cream.png" alt="${escapeHtml(BRAND.name)}" height="30" style="height: 30px; width: auto; display: inline-block;" />
      </div>
      <div style="height: 4px; background: ${GOLD};"></div>
      <div style="padding: 28px 24px; border: 1px solid #DCE5EC; border-top: none; background: #FFFFFF;">
        <h2 style="font-family: Georgia, 'Times New Roman', serif; font-weight: 500; margin-top: 0; color: ${NAVY};">Your Design Proposal</h2>
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>
          Thank you for the opportunity to work with you${quote.project_address ? ` on <strong>${escapeHtml(quote.project_address)}</strong>` : ''}.
          Your proposal (${escapeHtml(quote.quote_number)}) is ready to view.
        </p>
        <div style="margin-bottom: 12px;">
          <div style="font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: ${GOLD}; font-weight: 600; margin-bottom: 2px;">Total</div>
          <div style="font-size: 0.92rem; color: ${NAVY};">${money(quote.total)}</div>
        </div>
        <p style="margin-top: 18px;">
          Please review the proposal at the link below. If everything looks good, reply to this email and we'll get started —
          or let us know if you have any questions.
        </p>
        <p style="margin-top: 24px;">
          <a href="${proposalUrl}" style="display: inline-block; background: ${NAVY}; color: #FFFFFF; padding: 12px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.03em;">View your proposal</a>
        </p>
        <p style="margin-top: 18px;">
          Sincerely,<br/>
          <strong>${escapeHtml(BRAND.name)}</strong>
        </p>
      </div>
      <div style="background: ${CREAM}; padding: 14px 24px; text-align: center;">
        <p style="font-size: 0.7rem; color: #8296a6; letter-spacing: 0.04em; margin: 0;">
          ${escapeHtml(BRAND.name)} · ${escapeHtml(BRAND.tagline)}
        </p>
      </div>
    </div>
  `;

  return { to, subject, html, proposalUrl };
}

export async function sendProposalStudioEmail(quote) {
  const { to, subject, html } = buildProposalEmail(quote);
  if (!to) return { sent: false, error: 'This quote has no client email on file.' };

  const resend = getResend();
  if (!resend) return { sent: false, error: 'Email is not configured.' };

  try {
    const result = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL, to, subject, html });
    if (result?.error) return { sent: false, error: result.error.message || 'Delivery failed.' };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message || 'Delivery failed.' };
  }
}

/**
 * Builds {to, subject, html, intakeUrl} for the "Request more info" intake
 * form email. Same preview-then-send shape as buildProposalEmail.
 */
export function buildIntakeEmail(quote) {
  const to = quote.client_email || '';
  const firstName = (quote.client_name || '').split(' ')[0] || 'there';
  const intakeUrl = `${SITE_URL}/intake/${quote.share_token}`;
  const subject = `A few details for your ${BRAND.name} project`;

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: ${NAVY};">
      <div style="background: ${NAVY_DARK}; padding: 22px 24px; text-align: center;">
        <img src="${SITE_URL}/images/logo-cream.png" alt="${escapeHtml(BRAND.name)}" height="30" style="height: 30px; width: auto; display: inline-block;" />
      </div>
      <div style="height: 4px; background: ${GOLD};"></div>
      <div style="padding: 28px 24px; border: 1px solid #DCE5EC; border-top: none; background: #FFFFFF;">
        <h2 style="font-family: Georgia, 'Times New Roman', serif; font-weight: 500; margin-top: 0; color: ${NAVY};">Tell us about your project</h2>
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>
          To help us put together the best design for you${quote.project_address ? ` at <strong>${escapeHtml(quote.project_address)}</strong>` : ''},
          could you fill out a few quick details? It only takes a few minutes.
        </p>
        <p style="margin-top: 24px;">
          <a href="${intakeUrl}" style="display: inline-block; background: ${NAVY}; color: #FFFFFF; padding: 12px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.03em;">Tell us more</a>
        </p>
        <p style="margin-top: 18px;">
          Sincerely,<br/>
          <strong>${escapeHtml(BRAND.name)}</strong>
        </p>
      </div>
      <div style="background: ${CREAM}; padding: 14px 24px; text-align: center;">
        <p style="font-size: 0.7rem; color: #8296a6; letter-spacing: 0.04em; margin: 0;">
          ${escapeHtml(BRAND.name)} · ${escapeHtml(BRAND.tagline)}
        </p>
      </div>
    </div>
  `;

  return { to, subject, html, intakeUrl };
}

export async function sendIntakeStudioEmail(quote) {
  const { to, subject, html } = buildIntakeEmail(quote);
  if (!to) return { sent: false, error: 'This quote has no client email on file.' };

  const resend = getResend();
  if (!resend) return { sent: false, error: 'Email is not configured.' };

  try {
    const result = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL, to, subject, html });
    if (result?.error) return { sent: false, error: result.error.message || 'Delivery failed.' };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message || 'Delivery failed.' };
  }
}
