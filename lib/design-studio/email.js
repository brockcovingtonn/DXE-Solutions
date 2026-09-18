import { Resend } from 'resend';
import { BRAND, DESIGN_STUDIO_CONTACT } from './brand';
import { supabaseAdmin } from './server';
import { sendPushToUser } from '@/lib/push-notifications';

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
 *
 * `intent: 'esign'` (from the "Request e-sign" staff action) swaps the
 * copy/CTA to a signature-request framing — same proposal link, same
 * pricing, just a different ask.
 */
export function buildProposalEmail(quote, { intent } = {}) {
  const to = quote.client_email || '';
  const firstName = (quote.client_name || '').split(' ')[0] || 'there';
  const proposalUrl = `${SITE_URL}/proposal/${quote.share_token}`;
  const isEsign = intent === 'esign';
  const subject = isEsign ? 'Please Sign Your Design Proposal' : 'Your Design Proposal';

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: ${NAVY};">
      <div style="background: ${NAVY_DARK}; padding: 22px 24px; text-align: center;">
        <img src="${SITE_URL}/images/logo-cream.png" alt="${escapeHtml(BRAND.name)}" height="28" style="height: 28px; width: auto; vertical-align: middle; display: inline-block;" />
        <span style="color: rgba(255,255,255,0.4); font-size: 15px; margin: 0 10px; vertical-align: middle; display: inline-block;">|</span>
        <img src="${SITE_URL}/images/higher-thinking-logo.png" alt="Higher Thinking Consulting" height="56" style="height: 56px; width: auto; vertical-align: middle; display: inline-block;" />
      </div>
      <div style="height: 4px; background: ${GOLD};"></div>
      <div style="padding: 28px 24px; border: 1px solid #DCE5EC; border-top: none; background: #FFFFFF;">
        <h2 style="font-family: Georgia, 'Times New Roman', serif; font-weight: 500; margin-top: 0; color: ${NAVY};">${isEsign ? 'Please Review &amp; Sign' : 'Your Design Proposal'}</h2>
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>
          ${isEsign
            ? `Your proposal is ready for your signature${quote.project_address ? ` for <strong>${escapeHtml(quote.project_address)}</strong>` : ''}. Please review the details below and sign electronically to approve.`
            : `It's been a pleasure getting to know your project${quote.project_address ? ` at <strong>${escapeHtml(quote.project_address)}</strong>` : ''}, and we're genuinely excited about where this can go together. We've put together a proposal with you in mind — take a look whenever you're ready.`}
        </p>
        <div style="margin-bottom: 12px;">
          <div style="font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: ${GOLD}; font-weight: 600; margin-bottom: 2px;">Total</div>
          <div style="font-size: 0.92rem; color: ${NAVY};">${money(quote.total)}</div>
        </div>
        <p style="margin-top: 18px;">
          ${isEsign
            ? "Follow the link below to review the proposal and sign electronically — it only takes a minute."
            : "Take your time looking everything over. When you're ready, simply click Approve on the proposal to sign and move forward, or Deny if it's not quite the right fit — and please don't hesitate to reach out with any questions along the way."}
        </p>
        <p style="margin-top: 24px;">
          <a href="${proposalUrl}" style="display: inline-block; background: ${NAVY}; color: #FFFFFF; padding: 12px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.03em;">${isEsign ? 'Review & sign' : 'View your proposal'}</a>
        </p>
        <p style="margin-top: 18px;">
          Sincerely,<br/>
          <strong>DXE Solutions &amp; Higher Thinking Consulting</strong>
        </p>
      </div>
      <div style="background: ${CREAM}; padding: 14px 24px; text-align: center;">
        <p style="font-size: 0.7rem; color: #8296a6; letter-spacing: 0.04em; margin: 0;">
          DXE Solutions | Higher Thinking Consulting · Residential Design &amp; Space Planning · dxesolutions.com
        </p>
      </div>
    </div>
  `;

  return { to, subject, html, proposalUrl };
}

export async function sendProposalStudioEmail(quote, opts) {
  const { to, subject, html } = buildProposalEmail(quote, opts);
  if (!to) return { sent: false, error: 'This quote has no client email on file.' };

  const resend = getResend();
  if (!resend) return { sent: false, error: 'Email is not configured.' };

  try {
    const result = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL, to, bcc: DESIGN_STUDIO_CONTACT.email, subject, html });
    if (result?.error) return { sent: false, error: result.error.message || 'Delivery failed.' };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message || 'Delivery failed.' };
  }
}

/**
 * Emails + pushes staff the moment a client approves or denies a proposal
 * from the public link — Design Studio has no notification wiring of its
 * own yet, so this mirrors app/api/proposals/[id]/sign/route.js's pattern
 * (fixed notification address + push to every admin).
 */
export async function notifyStaffOfProposalDecision({ quote, decision, declineReason }) {
  const verb = decision === 'accepted' ? 'approved' : 'declined';
  const quoteUrl = `${SITE_URL}/design-studio/${quote.id}`;

  const resend = getResend();
  if (resend) {
    const recipients = [...new Set([process.env.ESTIMATE_NOTIFICATION_EMAIL, DESIGN_STUDIO_CONTACT.email].filter(Boolean))];
    const html = `
      <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: ${NAVY};">
        <p><strong>${escapeHtml(quote.client_name || 'A client')}</strong> ${verb} proposal <strong>${escapeHtml(quote.quote_number)}</strong>.</p>
        ${decision === 'declined' && declineReason ? `<p style="color: #718096;">Reason: ${escapeHtml(declineReason)}</p>` : ''}
        <p style="margin-top: 16px;"><a href="${quoteUrl}" style="color: ${NAVY};">View the quote →</a></p>
      </div>
    `;
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: recipients,
        subject: `${quote.quote_number} — Client ${verb}`,
        html,
      });
    } catch (err) {
      console.error('notifyStaffOfProposalDecision email error:', err);
    }
  }

  try {
    const db = supabaseAdmin();
    const { data: admins } = await db.from('profiles').select('id').eq('is_admin', true);
    await Promise.all(
      (admins || []).map((a) =>
        sendPushToUser(a.id, {
          title: `${quote.quote_number} — Client ${verb}`,
          body: `${quote.client_name || 'A client'} ${verb} their proposal`,
          data: { type: 'design_studio_quote', quoteId: quote.id },
        })
      )
    );
  } catch (err) {
    console.error('notifyStaffOfProposalDecision push error:', err);
  }
}

/**
 * Builds {to, subject, html, intakeUrl} for a lead's intake-form email —
 * sent from either the public Book-a-call form (project type "Design
 * Studio") or staff's "Send Intake Form" button. No quote exists yet at
 * this point; filling out the intake form is what creates one (see
 * lib/design-studio/leads.js).
 */
export function buildLeadIntakeEmail(lead) {
  const to = lead.email || '';
  const firstName = (lead.full_name || '').split(' ')[0] || 'there';
  const intakeUrl = `${SITE_URL}/intake/${lead.token}`;
  const subject = `A few details for your ${BRAND.name} project`;

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: ${NAVY};">
      <div style="background: ${NAVY_DARK}; padding: 22px 24px; text-align: center;">
        <img src="${SITE_URL}/images/logo-cream.png" alt="${escapeHtml(BRAND.name)}" height="28" style="height: 28px; width: auto; vertical-align: middle; display: inline-block;" />
        <span style="color: rgba(255,255,255,0.4); font-size: 15px; margin: 0 10px; vertical-align: middle; display: inline-block;">|</span>
        <img src="${SITE_URL}/images/higher-thinking-logo.png" alt="Higher Thinking Consulting" height="56" style="height: 56px; width: auto; vertical-align: middle; display: inline-block;" />
      </div>
      <div style="height: 4px; background: ${GOLD};"></div>
      <div style="padding: 28px 24px; border: 1px solid #DCE5EC; border-top: none; background: #FFFFFF;">
        <h2 style="font-family: Georgia, 'Times New Roman', serif; font-weight: 500; margin-top: 0; color: ${NAVY};">Tell us about your project</h2>
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>
          To help us put together the best design for you${lead.project_address ? ` at <strong>${escapeHtml(lead.project_address)}</strong>` : ''},
          could you fill out a few quick details? It only takes a few minutes.
        </p>
        <p style="margin-top: 24px;">
          <a href="${intakeUrl}" style="display: inline-block; background: ${NAVY}; color: #FFFFFF; padding: 12px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.03em;">Tell us more</a>
        </p>
        <p style="margin-top: 18px;">
          Sincerely,<br/>
          <strong>DXE Solutions &amp; Higher Thinking Consulting</strong>
        </p>
      </div>
      <div style="background: ${CREAM}; padding: 14px 24px; text-align: center;">
        <p style="font-size: 0.7rem; color: #8296a6; letter-spacing: 0.04em; margin: 0;">
          DXE Solutions | Higher Thinking Consulting · Residential Design &amp; Space Planning · dxesolutions.com
        </p>
      </div>
    </div>
  `;

  return { to, subject, html, intakeUrl };
}

export async function sendLeadIntakeEmail(lead) {
  const { to, subject, html } = buildLeadIntakeEmail(lead);
  if (!to) return { sent: false, error: 'This lead has no email on file.' };

  const resend = getResend();
  if (!resend) return { sent: false, error: 'Email is not configured.' };

  try {
    const result = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL, to, bcc: DESIGN_STUDIO_CONTACT.email, subject, html });
    if (result?.error) return { sent: false, error: result.error.message || 'Delivery failed.' };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message || 'Delivery failed.' };
  }
}
