import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';
import { sendLeadIntakeEmail } from '@/lib/design-studio/email';

export const dynamic = 'force-dynamic';

// Resend a pending lead's intake email — same content, same link (the
// lead's token doesn't change), for when the first one got lost or ignored.
export async function POST(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();

    const { data: lead, error } = await db.from('design_studio_leads').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!lead) {
      const e = new Error('Lead not found');
      e.status = 404;
      throw e;
    }

    const result = await sendLeadIntakeEmail(lead);
    if (!result.sent) {
      const e = new Error(result.error || 'Could not resend the intake email.');
      e.status = 400;
      throw e;
    }

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

// Dismiss a stale lead that will never convert.
export async function DELETE(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();
    const { error } = await db.from('design_studio_leads').delete().eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
