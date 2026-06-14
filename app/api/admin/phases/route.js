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

// Replaces all phases for a project with the provided list
export async function PUT(request) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, phases } = body;

    if (!projectId || !Array.isArray(phases)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Delete existing phases for this project
    const { error: delError } = await supabase
      .from('project_phases')
      .delete()
      .eq('project_id', projectId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 });
    }

    if (phases.length > 0) {
      const { error: insError } = await supabase.from('project_phases').insert(
        phases.map((p, i) => ({
          project_id: projectId,
          name: p.name,
          pct: p.pct,
          sort_order: i + 1,
          state: p.state,
        }))
      );

      if (insError) {
        return NextResponse.json({ error: insError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update phases error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
