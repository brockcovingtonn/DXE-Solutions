import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';
import { sendIntakeStudioEmail } from '@/lib/design-studio/email';

export const dynamic = 'force-dynamic';

// Actually sends the intake-form email (after the staff-approved preview
// from intake-email-preview) and stamps intake_requested_at so staff can
// see it was asked for, and how long they've been waiting on it.
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

    const result = await sendIntakeStudioEmail(quote);
    if (!result.sent) {
      const e = new Error(result.error || 'Could not send this email.');
      e.status = 400;
      throw e;
    }

    await db.from('design_studio_quotes').update({ intake_requested_at: new Date().toISOString() }).eq('id', id);

    return Response.json({ sent: true });
  } catch (err) {
    return jsonError(err);
  }
}
