import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { notifyClientOfProjectUpdate } from '@/lib/email-notifications';

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

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
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
    ];

    const update = {};
    for (const key of allowedFields) {
      if (key in body) update[key] = body[key];
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
        .select('name, profiles!projects_owner_id_fkey(email, email_notifications)')
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
