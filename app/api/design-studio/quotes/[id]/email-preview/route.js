import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';
import { buildProposalEmail } from '@/lib/design-studio/email';

export const dynamic = 'force-dynamic';

// Read-only: composes exactly what send-email would send, without sending
// it, so staff can approve the actual content first.
export async function GET(request, { params }) {
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

    const { searchParams } = new URL(request.url);
    const intent = searchParams.get('intent') || undefined;

    const email = buildProposalEmail(quote, { intent });
    return Response.json(email);
  } catch (err) {
    return jsonError(err);
  }
}
