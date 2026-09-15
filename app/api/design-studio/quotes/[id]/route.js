import { requireStaff, supabaseAdmin, loadActiveConfig, jsonError } from '@/lib/design-studio/server';
import { calculateQuote } from '@/lib/design-studio/pricing';

export const dynamic = 'force-dynamic';

const STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired'];

async function loadOwned(db, id, user) {
  const { data, error } = await db
    .from('design_studio_quotes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const e = new Error('Quote not found');
    e.status = 404;
    throw e;
  }
  if (!user.isMaster && data.created_by !== user.id) {
    const e = new Error('Not authorised');
    e.status = 403;
    throw e;
  }
  return data;
}

export async function GET(request, { params }) {
  try {
    const user = await requireStaff(request);
    const { id } = await params;
    const quote = await loadOwned(supabaseAdmin(), id, user);
    return Response.json({ quote, viewer: user });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();
    const existing = await loadOwned(db, id, user);
    const body = await request.json();

    const patch = {};

    if (body.status) {
      if (!STATUSES.includes(body.status)) {
        const e = new Error('Unknown status');
        e.status = 400;
        throw e;
      }
      patch.status = body.status;
      if (body.status === 'sent' && !existing.sent_at) patch.sent_at = new Date().toISOString();
      if (body.status === 'accepted' || body.status === 'declined') {
        patch.decided_at = new Date().toISOString();
      }
    }

    if (body.internalNotes !== undefined) patch.internal_notes = body.internalNotes;

    // A full re-price. Only allowed while the quote is still a draft, so a sent
    // proposal can never silently change underneath the client.
    if (body.reprice) {
      if (existing.status !== 'draft') {
        const e = new Error('Only draft quotes can be re-priced. Duplicate it instead.');
        e.status = 400;
        throw e;
      }
      const config = await loadActiveConfig();
      const recalculated = calculateQuote(body.reprice, config);
      Object.assign(patch, {
        client_name: body.reprice.clientName || null,
        client_email: body.reprice.clientEmail || null,
        client_phone: body.reprice.clientPhone || null,
        project_address: body.reprice.projectAddress || null,
        project_type: recalculated.inputs.projectType,
        service_level: recalculated.inputs.serviceLevel,
        complexity: recalculated.inputs.complexity,
        area_sqft: recalculated.inputs.areaSqft,
        rush: Boolean(body.reprice.rush),
        trade_partner: Boolean(body.reprice.tradePartner),
        add_ons: body.reprice.addOns || {},
        manual_adjustment: Number(body.reprice.manualAdjustment) || 0,
        adjustment_note: body.reprice.adjustmentNote || null,
        pricing: recalculated,
        config_snapshot: config,
        total: recalculated.total,
        deposit: recalculated.deposit,
      });
    }

    if (Object.keys(patch).length === 0) {
      return Response.json({ quote: existing });
    }

    const { data, error } = await db
      .from('design_studio_quotes')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return Response.json({ quote: data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();
    const existing = await loadOwned(db, id, user);
    if (existing.status !== 'draft' && !user.isMaster) {
      const e = new Error('Only drafts can be deleted.');
      e.status = 400;
      throw e;
    }
    const { error } = await db.from('design_studio_quotes').delete().eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
