import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';
import { sendProposalStudioEmail } from '@/lib/design-studio/email';

export const dynamic = 'force-dynamic';

// Actually sends the proposal email (after the staff-approved preview from
// email-preview) and, if the quote is still a draft, marks it sent — the
// same transition "Mark sent" does, since the client can now see it.
export async function POST(request, { params }) {
  try {
    const user = await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();

    const { data: quote, error } = await db.from('design_studio_quotes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!quote) {
      const e = new Error('Quote not found');
      e.status = 404;
      throw e;
    }
    if (!user.isMaster && quote.created_by !== user.id) {
      const e = new Error('Not authorised');
      e.status = 403;
      throw e;
    }

    const body = await request.json().catch(() => ({}));
    const result = await sendProposalStudioEmail(quote, { intent: body.intent });
    if (!result.sent) {
      const e = new Error(result.error || 'Could not send this email.');
      e.status = 400;
      throw e;
    }

    if (quote.status === 'draft') {
      await db
        .from('design_studio_quotes')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', id);
    }

    return Response.json({ sent: true });
  } catch (err) {
    return jsonError(err);
  }
}
