import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase, user) {
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

// Lists payment schedule items, optionally scoped to one project.
// Unscoped is used by the master accounting "Upcoming Payments" view.
export async function GET(request) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const projectId = new URL(request.url).searchParams.get('projectId');

  let query = supabase
    .from('payment_schedule_items')
    .select('*, projects(name, color)')
    .order('due_date');

  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const body = await request.json();
  const { projectId, description, amount, percent, dueDate, notes } = body;

  if (!projectId || !description?.trim() || !amount) {
    return NextResponse.json({ error: 'Project, description, and amount are required.' }, { status: 400 });
  }

  const { data: item, error } = await supabase
    .from('payment_schedule_items')
    .insert({
      project_id: projectId,
      description: description.trim(),
      amount,
      percent: percent || null,
      due_date: dueDate || null,
      notes: notes || null,
      created_by: user.id,
    })
    .select('*, projects(name, color)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, item });
}
