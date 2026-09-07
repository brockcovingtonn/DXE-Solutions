import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { sendPushToUser } from '@/lib/push-notifications';

async function requireAdmin(supabase, user) {
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
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
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

    if (assigned_to) {
      try {
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();

        await sendPushToUser(assigned_to, {
          title: `New Action Item${project?.name ? ` — ${project.name}` : ''}`,
          body: title.trim(),
          data: { type: 'action_item', projectId, actionItemId: item.id },
        });
      } catch (pushErr) {
        console.error('Push notification error (action item assigned):', pushErr);
      }
    }

    return NextResponse.json({ success: true, item });
  } catch (err) {
    console.error('Create action item error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
