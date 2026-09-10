import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

function validate(body) {
  const { category, question, options, correct_index } = body;
  if (!category || !question?.trim()) return 'Category and question are required';
  if (!Array.isArray(options) || options.length < 2 || options.some((o) => !String(o).trim())) {
    return 'Give at least two non-empty answer options';
  }
  if (typeof correct_index !== 'number' || correct_index < 0 || correct_index >= options.length) {
    return 'Mark which option is correct';
  }
  return null;
}

export async function POST(request) {
  const { supabase } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const err = validate(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const { data, error } = await supabase
    .from('training_quiz_questions')
    .insert({
      category: body.category,
      sort_order: body.sort_order ?? 0,
      question: body.question.trim(),
      options: body.options.map((o) => String(o).trim()),
      correct_index: body.correct_index,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, question: data });
}
