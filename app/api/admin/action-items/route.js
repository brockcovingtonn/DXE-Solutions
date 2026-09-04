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
  const { user, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, title, description, assigned_to, visible_to_client, due_date } = body;

    if (!projectId || !title?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from('action_items')
      .insert({
        project_id: projectId,
        title: title.trim(),
        description: description || null,
        assigned_to: assigned_to || null,
        visible_to_client: !!visible_to_client,
        due_date: due_date || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, item });
  } catch (err) {
    console.error('Create action item error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
