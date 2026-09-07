import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import { notifyAdminOfClientActivity } from '@/lib/email-notifications';
import { sendPushToUser } from '@/lib/push-notifications';

// Registers a photo record after a client or employee has uploaded the
// file to storage (from the native app). Logs activity and notifies
// the admin — mirrors /api/documents.
export async function POST(request) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { projectId, filePath, caption } = body;

    if (!projectId || !filePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const project = await getViewableProject(supabase, projectId, user, 'id, name');
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const uploaderName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Someone';

    const { data: photo, error } = await supabase
      .from('photos')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        file_path: filePath,
        caption: caption || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('activity').insert({
      project_id: projectId,
      type: 'photo',
      text: `1 new progress photo added by ${uploaderName}${caption ? ` — ${caption}` : ''}`,
    });

    await notifyAdminOfClientActivity({
      projectName: project.name,
      projectId,
      clientName: uploaderName,
      message: `added a new progress photo${caption ? ` — ${caption}` : ''}`,
    });

    try {
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
      await Promise.all(
        (admins || []).map((a) =>
          sendPushToUser(a.id, {
            title: `${project.name} — New Photo`,
            body: caption || `${uploaderName} added a new progress photo`,
            data: { type: 'photo', projectId },
          })
        )
      );
    } catch (pushErr) {
      console.error('Push notification error (client/employee photo):', pushErr);
    }

    return NextResponse.json({ success: true, photo });
  } catch (err) {
    console.error('Client/employee photo upload error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
