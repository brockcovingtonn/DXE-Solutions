import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { orderedModules, isModuleUnlocked } from '@/lib/training-course';

async function requireStaff(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin, is_employee').eq('id', user.id).single();
  if (!profile?.is_admin && !profile?.is_employee) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

// Marks a module's reading as done so its quiz becomes available.
export async function POST(request) {
  const { supabase } = await getRequestClient(request);
  const { user, error: authError } = await requireStaff(supabase);
  if (authError) return authError;

  const { category } = await request.json();
  if (!category) return NextResponse.json({ error: 'Missing category' }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: allSteps }, { data: progressRows }] = await Promise.all([
    admin.from('training_steps').select('project_type'),
    admin.from('training_course_progress').select('category, passed').eq('employee_id', user.id),
  ]);

  const modules = orderedModules((allSteps || []).map((s) => s.project_type));
  const idx = modules.indexOf(category);
  if (idx === -1) return NextResponse.json({ error: 'Unknown module' }, { status: 400 });

  const progressByCategory = Object.fromEntries((progressRows || []).map((r) => [r.category, r]));
  if (!isModuleUnlocked(idx, modules, progressByCategory)) {
    return NextResponse.json({ error: 'Finish the previous module first.' }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  await admin
    .from('training_course_progress')
    .upsert(
      { employee_id: user.id, category, reviewed: true, updated_at: nowIso },
      { onConflict: 'employee_id,category' }
    );

  return NextResponse.json({ success: true });
}
