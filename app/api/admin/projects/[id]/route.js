import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { notifyClientOfProjectUpdate } from '@/lib/email-notifications';
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

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function PATCH(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const allowedFields = [
      'name',
      'address',
      'project_type',
      'started_on',
      'estimated_completion',
      'progress_pct',
      'status',
      'apn',
      'jurisdiction',
      'zoning',
      'lot_size',
      'building_size',
      'color',
    ];

    const update = {};
    for (const key of allowedFields) {
      if (key in body) update[key] = body[key];
    }
    // Empty string isn't valid for a date column — the form sends ''
    // for a blank date input, not null.
    for (const dateField of ['started_on', 'estimated_completion']) {
      if (update[dateField] === '') update[dateField] = null;
    }

    // Fetch current state to detect a status change
    let previousStatus = null;
    if ('status' in update) {
      const { data: existing } = await supabase
        .from('projects')
        .select('status')
        .eq('id', params.id)
        .single();
      previousStatus = existing?.status;
    }

    const { error } = await supabase.from('projects').update(update).eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Notify the client if the status actually changed
    if ('status' in update && update.status !== previousStatus) {
      const { data: project } = await supabase
        .from('projects')
        .select('name, owner_id, profiles!projects_owner_id_fkey(email, email_notifications)')
        .eq('id', params.id)
        .single();

      if (project?.profiles?.email) {
        await notifyClientOfProjectUpdate({
          clientEmail: project.profiles.email,
          clientNotificationsEnabled: project.profiles.email_notifications,
          projectName: project.name,
          projectId: params.id,
          message: `Your project status changed to "${capitalize(update.status)}".`,
        });
      }

      if (project?.owner_id) {
        try {
          await sendPushToUser(project.owner_id, {
            title: `${project.name} — Status Update`,
            body: `Your project status changed to "${capitalize(update.status)}".`,
            data: { type: 'status', projectId: params.id },
          });
        } catch (pushErr) {
          console.error('Push notification error (project status):', pushErr);
        }
      }

      await supabase.from('activity').insert({
        project_id: params.id,
        type: 'status',
        text: `Project status changed to ${capitalize(update.status)}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update project error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Permanently deletes a project. All child rows (documents, permits,
// notes, photos, invoices, phases, team, etc.) cascade automatically;
// this also clears the project's stored files from each bucket.
export async function DELETE(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const projectId = params.id;

  try {
    for (const bucket of ['project-documents', 'project-photos', 'project-invoices']) {
      const { data: files } = await supabase.storage.from(bucket).list(projectId, { limit: 1000 });
      if (files && files.length > 0) {
        await supabase.storage.from(bucket).remove(files.map((f) => `${projectId}/${f.name}`));
      }
    }

    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete project error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
