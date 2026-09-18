import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getStaffUser, supabaseAdmin, loadActiveConfig } from '@/lib/design-studio/server';
import QuoteBuilder from '@/components/design-studio/QuoteBuilder';
import { C, S } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

export default async function EditQuotePage({ params }) {
  const user = await getStaffUser();
  if (!user) redirect('/login');
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: quote } = await db.from('design_studio_quotes').select('*').eq('id', id).maybeSingle();
  if (!quote) notFound();
  if (!user.isMaster && quote.created_by !== user.id) redirect('/design-studio');
  if (quote.status !== 'draft') redirect(`/design-studio/${id}`);

  const config = await loadActiveConfig();

  const initial = {
    clientId: quote.client_id || null,
    clientName: quote.client_name || '',
    clientEmail: quote.client_email || '',
    clientPhone: quote.client_phone || '',
    projectAddress: quote.project_address || '',
    projectType: quote.project_type,
    serviceLevel: quote.service_level,
    complexity: quote.complexity,
    areaSqft: quote.area_sqft,
    rush: quote.rush,
    tradePartner: quote.trade_partner,
    addOns: quote.add_ons || {},
    manualAdjustment: Number(quote.manual_adjustment) || 0,
    adjustmentNote: quote.adjustment_note || '',
    internalNotes: quote.internal_notes || '',
    includedOverride: quote.included_override || null,
    hideAddOnMenu: quote.hide_addon_menu || false,
  };

  return (
      <div style={S.shell}>
        <Link href={`/design-studio/${id}`} style={{ ...S.small, color: C.clay, textDecoration: 'none' }}>
          ← {quote.quote_number}
        </Link>
        <h1 style={{ ...S.h1, margin: '10px 0 6px' }}>Re-price {quote.quote_number}</h1>
        <div style={{ ...S.small, marginBottom: 20 }}>
          Re-pricing applies the current rate card (v{config.version}). Only drafts can be re-priced.
        </div>
        <QuoteBuilder config={config} viewer={user} initial={initial} quoteId={id} />
      </div>
  );
}
