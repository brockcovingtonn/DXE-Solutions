import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

// Copies a finalized/sent bid into a new editable draft — the way to
// "change" a bid that's already gone out, without touching the sent
// record.
export async function POST(request, { params }) {
  const { supabase } = await getRequestClient(request);
  const { user, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { data: source } = await supabase.from('bids').select('*').eq('id', params.id).maybeSingle();
  if (!source) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

  const { data: lineItems } = await supabase.from('bid_line_items').select('*').eq('bid_id', params.id).order('sort_order');

  const { data: copy, error } = await supabase
    .from('bids')
    .insert({
      project_id: source.project_id,
      status: 'draft',
      title: `${source.title} (Copy)`,
      client_name: source.client_name,
      project_address: source.project_address,
      prepared_by: source.prepared_by,
      scope_summary: source.scope_summary,
      selected_scopes: source.selected_scopes,
      subtotal: source.subtotal,
      adjustment: source.adjustment,
      adjustment_label: source.adjustment_label,
      total: source.total,
      payment_terms: source.payment_terms,
      valid_until: source.valid_until,
      notes: source.notes,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (lineItems && lineItems.length > 0) {
    await supabase.from('bid_line_items').insert(
      lineItems.map((li) => ({
        bid_id: copy.id,
        category: li.category,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unit_price: li.unit_price,
        amount: li.amount,
        sort_order: li.sort_order,
      }))
    );
  }

  return NextResponse.json({ success: true, bid: copy });
}
