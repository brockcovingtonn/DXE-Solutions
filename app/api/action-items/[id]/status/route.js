import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { canAccessAsStaff } from '@/lib/project-access';

// Lets an admin, or the employee a task is assigned to (on a project
// they're staffed on), toggle an action item open/done — without
// granting full edit access the way the admin action-items route does.
export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (status !== 'open' && status !== 'done') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data: item } = await supabase
      .from('action_items')
      .select('id, project_id')
      .eq('id', params.id)
      .single();

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const allowed = await canAccessAsStaff(supabase, item.project_id, user.id);

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('action_items')
      .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update action item status error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
