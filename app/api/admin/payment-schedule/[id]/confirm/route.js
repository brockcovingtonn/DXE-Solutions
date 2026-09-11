import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase, user) {
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

// Admin confirms a scheduled payment is still accurate — this is what
// unlocks the auto-invoice send when the due date arrives.
export async function POST(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const { data: item, error } = await supabase
    .from('payment_schedule_items')
    .update({ confirmed_at: new Date().toISOString(), confirmed_by: user.id })
    .eq('id', params.id)
    .select('*, projects(name, color)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, item });
}
