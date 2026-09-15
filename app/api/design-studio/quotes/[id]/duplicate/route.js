import { requireStaff, supabaseAdmin, loadActiveConfig, jsonError } from '@/lib/design-studio/server';
import { calculateQuote, validUntil } from '@/lib/design-studio/pricing';
import { BRAND } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

// Sent quotes are frozen; this is how you edit one. Duplicates as a new
// draft, re-priced against the current rate card rather than the source
// quote's frozen snapshot.
export async function POST(request, { params }) {
  try {
    const user = await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();

    const { data: source, error: loadError } = await db
      .from('design_studio_quotes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!source) {
      const e = new Error('Quote not found');
      e.status = 404;
      throw e;
    }
    if (!user.isMaster && source.created_by !== user.id) {
      const e = new Error('Not authorised');
      e.status = 403;
      throw e;
    }

    const config = await loadActiveConfig();
    const quote = calculateQuote(
      {
        projectType: source.project_type,
        serviceLevel: source.service_level,
        complexity: source.complexity,
        areaSqft: source.area_sqft,
        rush: source.rush,
        tradePartner: source.trade_partner,
        addOns: source.add_ons || {},
        manualAdjustment: source.manual_adjustment || 0,
        adjustmentNote: source.adjustment_note || '',
      },
      config
    );

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
        client_name: source.client_name,
        client_email: source.client_email,
        client_phone: source.client_phone,
        project_address: source.project_address,
        project_type: quote.inputs.projectType,
        service_level: quote.inputs.serviceLevel,
        complexity: quote.inputs.complexity,
        area_sqft: quote.inputs.areaSqft,
        rush: Boolean(source.rush),
        trade_partner: Boolean(source.trade_partner),
        add_ons: source.add_ons || {},
        manual_adjustment: Number(source.manual_adjustment) || 0,
        adjustment_note: source.adjustment_note || null,
        internal_notes: source.internal_notes || null,
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
