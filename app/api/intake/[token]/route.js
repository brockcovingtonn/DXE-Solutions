import { supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

// Unauthenticated, reachable only with the quote's share_token — same
// pattern as app/proposal/[token]/page.js. The client never has an
// account/session here, so this can't route through requireStaff.
export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const db = supabaseAdmin();
    const { data: quote } = await db
      .from('design_studio_quotes')
      .select('id, quote_number, client_name, intake, intake_submitted_at')
      .eq('share_token', token)
      .maybeSingle();
    if (!quote) {
      const e = new Error('Not found');
      e.status = 404;
      throw e;
    }
    return Response.json({ quote });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const db = supabaseAdmin();

    const { data: quote } = await db
      .from('design_studio_quotes')
      .select('id')
      .eq('share_token', token)
      .maybeSingle();
    if (!quote) {
      const e = new Error('Not found');
      e.status = 404;
      throw e;
    }

    const { error } = await db
      .from('design_studio_quotes')
      .update({ intake: body.intake || {}, intake_submitted_at: new Date().toISOString() })
      .eq('id', quote.id);
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
