import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

export async function POST(request) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      ownerId,
      projectName,
      address,
      projectType,
      startedOn,
      estimatedCompletion,
    } = body;

    if (!ownerId || !projectName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        owner_id: ownerId,
        name: projectName,
        address: address || null,
        project_type: projectType || null,
        started_on: startedOn || null,
        estimated_completion: estimatedCompletion || null,
        progress_pct: 0,
        status: 'planning',
      })
      .select()
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 400 });
    }

    const defaultPhases = ['Pre-Design', 'Permits', 'Site Work', 'Framing', 'MEP', 'Finish'];
    await supabase.from('project_phases').insert(
      defaultPhases.map((name, i) => ({
        project_id: project.id,
        name,
        pct: 0,
        sort_order: i + 1,
        state: i === 0 ? 'active' : 'pending',
      }))
    );

    await supabase.from('activity').insert({
      project_id: project.id,
      type: 'status',
      text: `Project created: ${projectName}`,
    });

    return NextResponse.json({ success: true, projectId: project.id });
  } catch (err) {
    console.error('Create project error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
