import { supabaseAdmin, jsonError } from '@/lib/design-studio/server';
import { convertLeadToQuote } from '@/lib/design-studio/leads';

export const dynamic = 'force-dynamic';

// Unauthenticated, reachable only with a lead's token — same "no login"
// pattern as the old quote-scoped /proposal/[token]. Submitting is what
// actually creates the quote; see lib/design-studio/leads.js.
export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const db = supabaseAdmin();
    const { data: lead } = await db
      .from('design_studio_leads')
      .select('full_name, intake')
      .eq('token', token)
      .maybeSingle();
    if (!lead) {
      const e = new Error('Not found');
      e.status = 404;
      throw e;
    }
    return Response.json({ lead: { fullName: lead.full_name, intake: lead.intake } });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const db = supabaseAdmin();

    const { data: lead } = await db.from('design_studio_leads').select('*').eq('token', token).maybeSingle();
    if (!lead) {
      const e = new Error('Not found');
      e.status = 404;
      throw e;
    }

    await convertLeadToQuote(db, lead, body.intake || {});

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
