import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';
import { createLead } from '@/lib/design-studio/leads';
import { sendLeadIntakeEmail } from '@/lib/design-studio/email';

export const dynamic = 'force-dynamic';

// Pending leads — submitted via the public Book-a-call form or staff's
// "Send Intake Form" button, not yet converted into a quote.
export async function GET(request) {
  try {
    await requireStaff(request);
    const db = supabaseAdmin();
    const { data, error } = await db.from('design_studio_leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return Response.json({ leads: data || [] });
  } catch (err) {
    return jsonError(err);
  }
}

// Staff-initiated intake request — the dashboard's "Send Intake Form"
// button. Same conversion path as a Design Studio Book-a-call submission
// (see lib/design-studio/leads.js): nothing lands in design_studio_quotes
// until the intake form is actually filled out.
export async function POST(request) {
  try {
    await requireStaff(request);
    const body = await request.json();
    const fullName = (body.fullName || '').trim();
    const email = (body.email || '').trim();
    if (!fullName || !email) {
      const e = new Error('Full name and email are required');
      e.status = 400;
      throw e;
    }

    const db = supabaseAdmin();
    const lead = await createLead(db, { fullName, email, phone: body.phone, projectAddress: body.address });

    const result = await sendLeadIntakeEmail(lead);
    if (!result.sent) {
      const e = new Error(result.error || 'Could not send the intake email.');
      e.status = 400;
      throw e;
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
