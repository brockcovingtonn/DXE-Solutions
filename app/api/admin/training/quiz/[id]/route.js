import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

export async function PUT(request, { params }) {
  const { supabase } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const update = {};
  if (typeof body.question === 'string') update.question = body.question.trim();
  if (Array.isArray(body.options)) update.options = body.options.map((o) => String(o).trim());
  if (typeof body.correct_index === 'number') update.correct_index = body.correct_index;
  if (typeof body.sort_order === 'number') update.sort_order = body.sort_order;

  if (update.options && (update.options.length < 2 || update.options.some((o) => !o))) {
    return NextResponse.json({ error: 'Give at least two non-empty answer options' }, { status: 400 });
  }

  const { error } = await supabase.from('training_quiz_questions').update(update).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const { supabase } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { error } = await supabase.from('training_quiz_questions').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
