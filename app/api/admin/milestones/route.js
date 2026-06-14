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

// Replaces all milestones for a project with the provided list
export async function PUT(request) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, milestones } = body;

    if (!projectId || !Array.isArray(milestones)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error: delError } = await supabase
      .from('milestones')
      .delete()
      .eq('project_id', projectId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 });
    }

    if (milestones.length > 0) {
      const { error: insError } = await supabase.from('milestones').insert(
        milestones.map((m, i) => ({
          project_id: projectId,
          name: m.name,
          display_date: m.display_date,
          state: m.state,
          sort_order: i + 1,
        }))
      );

      if (insError) {
        return NextResponse.json({ error: insError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update milestones error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
