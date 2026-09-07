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

const ALLOWED_FIELDS = ['title', 'description', 'assigned_to', 'visible_to_client', 'due_date', 'status'];

export async function PATCH(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const update = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) update[key] = body[key];
    }

    if (update.status === 'done') update.completed_at = new Date().toISOString();
    if (update.status === 'open') update.completed_at = null;

    let previousAssignedTo = null;
    if ('assigned_to' in update) {
      const { data: existing } = await supabase
        .from('action_items')
        .select('assigned_to')
        .eq('id', params.id)
        .single();
      previousAssignedTo = existing?.assigned_to;
    }

    const { data: item, error } = await supabase
      .from('action_items')
      .update(update)
      .eq('id', params.id)
      .select('title, project_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (update.assigned_to && update.assigned_to !== previousAssignedTo) {
      try {
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', item.project_id)
          .single();

        await sendPushToUser(update.assigned_to, {
          title: `New Action Item${project?.name ? ` — ${project.name}` : ''}`,
          body: item.title,
          data: { type: 'action_item', projectId: item.project_id, actionItemId: params.id },
        });
      } catch (pushErr) {
        console.error('Push notification error (action item reassigned):', pushErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update action item error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const { error } = await supabase.from('action_items').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete action item error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
