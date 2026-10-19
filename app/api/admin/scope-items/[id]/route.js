import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

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

// Admins can edit anything about an item; employees can only flip
// `completed` on items for projects they're assigned to — not rename or
// delete. That's not expressible as a single row-level policy, so this
// checks role here and does the write with the service-role client
// (same resolution used for room-scan access elsewhere in this app).
async function requireStaffForItem(supabase, user, itemId) {
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (profile?.is_admin) return { user, isAdmin: true };

  const { data: item } = await supabase.from('scope_items').select('project_id').eq('id', itemId).single();
  if (!item) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };

  const { data: assignment } = await supabase
    .from('project_employees')
    .select('project_id')
    .eq('project_id', item.project_id)
    .eq('employee_id', user.id)
    .maybeSingle();

  if (!assignment) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user, isAdmin: false, projectId: item.project_id };
}

export async function PATCH(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError, isAdmin } = await requireStaffForItem(supabase, user, params.id);
  if (authError) return authError;

  try {
    const body = await request.json();
    const admin = createAdminClient();

    const { data: current } = await admin
      .from('scope_items')
      .select('id, description, completed, area_id, project_id, scope_areas(name)')
      .eq('id', params.id)
      .single();

    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const update = {};
    if (isAdmin) {
      if ('description' in body) update.description = body.description?.trim() || null;
      if ('notes' in body) update.notes = body.notes?.trim() || null;
      if ('timeline' in body) update.timeline = body.timeline?.trim() || null;
      if ('sort_order' in body) update.sort_order = body.sort_order;
    }
    if ('completed' in body) {
      const completed = Boolean(body.completed);
      update.completed = completed;
      update.completed_at = completed ? new Date().toISOString() : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    const { error } = await admin.from('scope_items').update(update).eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log + recalculate only on the false -> true transition.
    if (update.completed === true && !current.completed) {
      const areaName = current.scope_areas?.name || 'Scope of Work';
      await admin.from('activity').insert({
        project_id: current.project_id,
        type: 'scope',
        text: `Completed "${current.description}" in ${areaName}`,
      });

      const { data: project } = await admin
        .from('projects')
        .select('progress_pct_auto')
        .eq('id', current.project_id)
        .single();

      if (project?.progress_pct_auto) {
        const { data: items } = await admin
          .from('scope_items')
          .select('completed')
          .eq('project_id', current.project_id);

        if (items && items.length > 0) {
          const pct = Math.round((items.filter((i) => i.completed).length / items.length) * 100);
          await admin.from('projects').update({ progress_pct: pct }).eq('id', current.project_id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update scope item error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const { error } = await supabase.from('scope_items').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete scope item error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
