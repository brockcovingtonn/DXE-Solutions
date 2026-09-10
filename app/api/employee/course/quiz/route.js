import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { orderedModules, isModuleUnlocked, QUIZ_PASS_PCT } from '@/lib/training-course';

async function requireStaff(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin, is_employee').eq('id', user.id).single();
  if (!profile?.is_admin && !profile?.is_employee) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

// Grades a category quiz and records progress. Server-side grading only —
// the client never sees the correct answers.
export async function POST(request) {
  const { supabase } = await getRequestClient(request);
  const { user, error: authError } = await requireStaff(supabase);
  if (authError) return authError;

  const { category, answers } = await request.json();
  if (!category || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'Missing category or answers' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Build the module order and check this module is actually unlocked.
  const [{ data: allSteps }, { data: progressRows }, { data: questions }] = await Promise.all([
    admin.from('training_steps').select('project_type'),
    admin.from('training_course_progress').select('category, passed, reviewed, best_score').eq('employee_id', user.id),
    admin.from('training_quiz_questions').select('id, correct_index').eq('category', category).order('sort_order'),
  ]);

  const modules = orderedModules((allSteps || []).map((s) => s.project_type));
  const idx = modules.indexOf(category);
  if (idx === -1) {
    return NextResponse.json({ error: 'Unknown module' }, { status: 400 });
  }
  const progressByCategory = Object.fromEntries((progressRows || []).map((r) => [r.category, r]));
  if (!isModuleUnlocked(idx, modules, progressByCategory)) {
    return NextResponse.json({ error: 'Finish the previous module first.' }, { status: 403 });
  }

  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'This module has no quiz yet.' }, { status: 400 });
  }

  // Grade.
  const results = questions.map((q, i) => ({
    questionId: q.id,
    correctIndex: q.correct_index,
    your: typeof answers[i] === 'number' ? answers[i] : null,
    correct: answers[i] === q.correct_index,
  }));
  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= QUIZ_PASS_PCT;

  const existing = progressByCategory[category];
  const bestScore = Math.max(existing?.best_score ?? 0, score);
  const nowIso = new Date().toISOString();

  await admin.from('training_course_progress').upsert(
    {
      employee_id: user.id,
      category,
      reviewed: true,
      passed: Boolean(existing?.passed) || passed,
      best_score: bestScore,
      last_attempt_at: nowIso,
      passed_at: existing?.passed ? undefined : passed ? nowIso : null,
      updated_at: nowIso,
    },
    { onConflict: 'employee_id,category' }
  );

  return NextResponse.json({
    score,
    passed,
    correctCount,
    total: questions.length,
    passMark: QUIZ_PASS_PCT,
    results: results.map((r) => ({ questionId: r.questionId, correct: r.correct, correctIndex: r.correctIndex })),
  });
}
