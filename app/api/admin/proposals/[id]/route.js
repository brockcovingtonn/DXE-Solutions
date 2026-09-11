import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { computeTotals } from '@/lib/proposal-totals';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

// Updates a proposal's fields and replaces its line items. Only while
// it's still a draft — a finalized/sent proposal is a record of what
// was actually promised, so it's read-only (duplicate it into a new
// draft instead).
export async function PATCH(request, { params }) {
  const { supabase } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { data: existing } = await supabase.from('proposals').select('status').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft proposals can be edited. Duplicate it to make changes.' }, { status: 409 });
  }

  const body = await request.json();
  const { lineItems, adjustment } = body;
  const { items, subtotal, total } = computeTotals(lineItems, adjustment);

  const update = {
    subtotal,
    total,
    adjustment: Number(adjustment) || 0,
    updated_at: new Date().toISOString(),
  };
  for (const [bodyKey, column] of [
    ['title', 'title'],
    ['clientName', 'client_name'],
    ['projectAddress', 'project_address'],
    ['preparedBy', 'prepared_by'],
    ['introParagraph', 'intro_paragraph'],
    ['scopeSummary', 'scope_summary'],
    ['selectedScopes', 'selected_scopes'],
    ['adjustmentLabel', 'adjustment_label'],
    ['paymentTerms', 'payment_terms'],
    ['limitations', 'limitations'],
    ['validUntil', 'valid_until'],
    ['notes', 'notes'],
  ]) {
    if (bodyKey in body) update[column] = body[bodyKey] || null;
  }
  if ('selectedScopes' in body) update.selected_scopes = body.selectedScopes || [];

  const { error } = await supabase.from('proposals').update(update).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (Array.isArray(lineItems)) {
    const { error: delError } = await supabase.from('proposal_line_items').delete().eq('proposal_id', params.id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 400 });

    if (items.length > 0) {
      const { error: insError } = await supabase.from('proposal_line_items').insert(
        items.map((li, i) => ({
          proposal_id: params.id,
          category: li.category || null,
          description: li.description || null,
          quantity: li.quantity,
          unit: li.unit || 'LS',
          unit_price: li.unit_price,
          amount: li.amount,
          sort_order: i,
        }))
      );
      if (insError) return NextResponse.json({ error: insError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const { supabase } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { data: proposal } = await supabase.from('proposals').select('pdf_path').eq('id', params.id).maybeSingle();
  if (proposal?.pdf_path) {
    await supabase.storage.from('project-proposals').remove([proposal.pdf_path]);
  }

  const { error } = await supabase.from('proposals').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
