import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { computeTotals } from '@/lib/proposal-totals';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin, first_name, last_name').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user, profile };
}

export async function POST(request) {
  const { supabase } = await getRequestClient(request);
  const { user, profile, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const { projectId, lineItems, adjustment } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'Missing project' }, { status: 400 });
  }

  const { items, subtotal, total } = computeTotals(lineItems, adjustment);

  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert({
      project_id: projectId,
      status: 'draft',
      title: body.title || 'Proposal',
      client_name: body.clientName || null,
      project_address: body.projectAddress || null,
      prepared_by: body.preparedBy || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null,
      intro_paragraph: body.introParagraph || null,
      scope_summary: body.scopeSummary || null,
      selected_scopes: body.selectedScopes || [],
      subtotal,
      adjustment: Number(adjustment) || 0,
      adjustment_label: body.adjustmentLabel || null,
      total,
      payment_terms: body.paymentTerms || null,
      limitations: body.limitations || null,
      valid_until: body.validUntil || null,
      notes: body.notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (items.length > 0) {
    const { error: liError } = await supabase.from('proposal_line_items').insert(
      items.map((li, i) => ({
        proposal_id: proposal.id,
        category: li.category || null,
        description: li.description || null,
        quantity: li.quantity,
        unit: li.unit || 'LS',
        unit_price: li.unit_price,
        amount: li.amount,
        sort_order: i,
      }))
    );
    if (liError) return NextResponse.json({ error: liError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, proposal });
}
