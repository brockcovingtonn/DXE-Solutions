import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase, user) {
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

const EDITABLE_FIELDS = { description: 'description', amount: 'amount', percent: 'percent', dueDate: 'due_date', notes: 'notes', status: 'status' };

// Editing the amount or due date changes what was promised to be
// confirmed, so it clears any existing confirmation — the admin has to
// re-confirm the new schedule before it can auto-send.
export async function PATCH(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const body = await request.json();
  const update = { updated_at: new Date().toISOString() };
  for (const [bodyKey, column] of Object.entries(EDITABLE_FIELDS)) {
    if (bodyKey in body) update[column] = body[bodyKey];
  }
  if (update.due_date === '') update.due_date = null;

  if ('amount' in update || 'due_date' in update) {
    update.confirmed_at = null;
    update.confirmed_by = null;
    update.reminder_30_sent_at = null;
    update.reminder_14_sent_at = null;
    update.reminder_7_sent_at = null;
    update.reminder_3_sent_at = null;
    update.missed_alert_sent_at = null;
  }

  const { data: item, error } = await supabase
    .from('payment_schedule_items')
    .update(update)
    .eq('id', params.id)
    .select('*, projects(name, color)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, item });
}

export async function DELETE(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const { error } = await supabase.from('payment_schedule_items').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
