import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

// Averages unit_price per scope category across every past finalized/sent
// proposal's line items — the data-driven "estimate from past proposals"
// the proposal builder offers when you toggle on a scope item.
// Deliberately a plain average rather than an LLM guess: pricing needs
// to be traceable back to what was actually charged before.
export async function GET(request) {
  const { supabase } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const categories = (searchParams.get('categories') || '').split(',').map((c) => c.trim()).filter(Boolean);
  if (categories.length === 0) return NextResponse.json({ estimates: {} });

  const { data: proposalIdsRows } = await supabase.from('proposals').select('id').in('status', ['finalized', 'sent']);
  const proposalIds = (proposalIdsRows || []).map((b) => b.id);
  if (proposalIds.length === 0) return NextResponse.json({ estimates: {} });

  const { data: rows, error } = await supabase
    .from('proposal_line_items')
    .select('category, unit_price, amount, unit')
    .in('proposal_id', proposalIds)
    .in('category', categories);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const estimates = {};
  categories.forEach((cat) => {
    const matches = (rows || []).filter((r) => r.category === cat && Number(r.unit_price) > 0);
    if (matches.length === 0) return;
    const avgUnitPrice = matches.reduce((sum, r) => sum + Number(r.unit_price), 0) / matches.length;
    const avgAmount = matches.reduce((sum, r) => sum + Number(r.amount), 0) / matches.length;
    estimates[cat] = {
      avgUnitPrice: Math.round(avgUnitPrice * 100) / 100,
      avgAmount: Math.round(avgAmount * 100) / 100,
      sampleSize: matches.length,
    };
  });

  return NextResponse.json({ estimates });
}
