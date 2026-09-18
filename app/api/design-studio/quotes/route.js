import { requireStaff, supabaseAdmin, loadActiveConfig, jsonError } from '@/lib/design-studio/server';
import { calculateQuote, validUntil } from '@/lib/design-studio/pricing';
import { BRAND } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await requireStaff(request);
    const db = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = db
      .from('design_studio_quotes')
      .select(
        'id, quote_number, status, source, client_name, project_address, project_type, service_level, complexity, area_sqft, total, deposit, valid_until, created_at, created_by, created_by_name, share_token'
      )
      .order('created_at', { ascending: false })
      .limit(200);

    // Employees see their own pipeline; master admins see everything.
    if (!user.isMaster) query = query.eq('created_by', user.id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ quotes: data || [], viewer: user });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    const user = await requireStaff(request);
    const body = await request.json();
    const config = await loadActiveConfig();

    // Recalculated server-side. The browser's number is never trusted.
    const quote = calculateQuote(body, config);
    const db = supabaseAdmin();

    const { data: numberRow, error: numberError } = await db.rpc(
      'design_studio_next_quote_number',
      { prefix: BRAND.quotePrefix }
    );
    if (numberError) throw numberError;

    const { data, error } = await db
      .from('design_studio_quotes')
      .insert({
        quote_number: numberRow,
        status: 'draft',
        client_id: body.clientId || null,
        client_name: body.clientName || null,
        client_email: body.clientEmail || null,
        client_phone: body.clientPhone || null,
        project_address: body.projectAddress || null,
        project_type: quote.inputs.projectType,
        service_level: quote.inputs.serviceLevel,
        complexity: quote.inputs.complexity,
        area_sqft: quote.inputs.areaSqft,
        rush: Boolean(body.rush),
        trade_partner: Boolean(body.tradePartner),
        add_ons: body.addOns || {},
        manual_adjustment: Number(body.manualAdjustment) || 0,
        adjustment_note: body.adjustmentNote || null,
        internal_notes: body.internalNotes || null,
        included_override: Array.isArray(body.includedOverride) ? body.includedOverride : null,
        hide_addon_menu: Boolean(body.hideAddOnMenu),
        pricing: quote,
        config_snapshot: config,
        total: quote.total,
        deposit: quote.deposit,
        valid_until: validUntil(config),
        created_by: user.id,
        created_by_name: user.name,
      })
      .select('id, quote_number, share_token')
      .single();
    if (error) throw error;

    return Response.json({ quote: data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
