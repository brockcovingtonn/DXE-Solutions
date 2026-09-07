import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import { notifyAdminOfClientActivity } from '@/lib/email-notifications';
import { sendPushToUser } from '@/lib/push-notifications';

// Allows an authenticated client (or admin previewing) to post a note
// on a project they own. Logs activity and notifies the admin.
export async function POST(request) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { projectId, text } = body;

    if (!projectId || !text?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const project = await getViewableProject(supabase, projectId, user, 'id, name, owner_id');
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const authorName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Client';

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        project_id: projectId,
        author_id: user.id,
        author_name: authorName,
        author_role: 'client',
        body: text.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('activity').insert({
      project_id: projectId,
      type: 'note',
      text: `${authorName} added a note: ${text.trim().slice(0, 100)}${text.trim().length > 100 ? '...' : ''}`,
    });

    await notifyAdminOfClientActivity({
      projectName: project.name,
      projectId,
      clientName: authorName,
      message: `added a note: "${text.trim().slice(0, 140)}${text.trim().length > 140 ? '...' : ''}"`,
    });

    try {
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
      await Promise.all(
        (admins || []).map((a) =>
          sendPushToUser(a.id, {
            title: `${authorName} — ${project.name}`,
            body: `New note: ${text.trim().slice(0, 140)}`,
            data: { type: 'note', projectId },
          })
        )
      );
    } catch (pushErr) {
      console.error('Push notification error (client note):', pushErr);
    }

    return NextResponse.json({ success: true, note });
  } catch (err) {
    console.error('Client note error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
