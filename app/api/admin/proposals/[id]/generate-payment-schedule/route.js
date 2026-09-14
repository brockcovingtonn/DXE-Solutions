import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase, user) {
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

// Matches lines like "50% upon contract execution" or
// "10% – $830 Contract Execution" — a leading percent, an optional
// dollar figure (ignored; the amount is always recomputed from the
// proposal's current total so it can't drift from a stale number),
// then the milestone description.
const MILESTONE_LINE = /^\s*(\d+(?:\.\d+)?)\s*%\s*[-–—:]*\s*(?:\$[\d,]+(?:\.\d+)?)?\s*[-–—:]*\s*(.+?)\s*$/;

function parseMilestones(paymentTerms, total) {
  const lines = String(paymentTerms || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const milestones = [];
  for (const line of lines) {
    const match = line.match(MILESTONE_LINE);
    if (!match) continue;
    const percent = Number(match[1]);
    if (!Number.isFinite(percent) || percent <= 0) continue;
    milestones.push({
      description: match[2],
      percent,
      amount: Math.round(total * (percent / 100) * 100) / 100,
    });
  }
  if (milestones.length === 0 && Number(total) > 0) {
    milestones.push({ description: 'Full amount', percent: 100, amount: Number(total) });
  }
  return milestones;
}

// Suggests a payment schedule parsed from this proposal's payment
// terms + current total, for the admin to review/edit before creating
// real payment_schedule_items via POST — never inserts anything itself.
export async function GET(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const { data: proposal } = await supabase
    .from('proposals')
    .select('title, total, payment_terms, project_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  return NextResponse.json({
    projectId: proposal.project_id,
    total: proposal.total,
    suggestedMilestones: parseMilestones(proposal.payment_terms, proposal.total),
  });
}

// Creates the (admin-reviewed, possibly edited) milestone rows as real
// payment_schedule_items. Left undated by default — most of these are
// event-triggered ("upon contract execution"), not calendar dates; the
// admin fills in real dates afterward once known, same as any
// manually-added milestone.
export async function POST(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const { data: proposal } = await supabase.from('proposals').select('project_id').eq('id', params.id).maybeSingle();
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  const body = await request.json();
  const milestones = Array.isArray(body.milestones) ? body.milestones : [];

  const rows = milestones
    .filter((m) => m.description?.trim() && Number(m.amount) > 0)
    .map((m) => ({
      project_id: proposal.project_id,
      description: m.description.trim(),
      amount: Number(m.amount),
      percent: m.percent != null && m.percent !== '' ? Number(m.percent) : null,
      due_date: m.dueDate || null,
      created_by: user.id,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid milestones to create.' }, { status: 400 });
  }

  const { data: created, error } = await supabase.from('payment_schedule_items').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true, items: created });
}
