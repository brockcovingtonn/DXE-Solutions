import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import { notifyAdminOfClientActivity } from '@/lib/email-notifications';

// Registers a document record after the client has uploaded the file
// to storage (from the browser). Logs activity and notifies the admin.
export async function POST(request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { projectId, fileName, filePath, fileType } = body;

    if (!projectId || !fileName || !filePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const project = await getViewableProject(supabase, projectId, user, 'id, name');
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        uploaded_by_role: 'client',
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        badge: 'new',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const clientName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'A client';

    await supabase.from('activity').insert({
      project_id: projectId,
      type: 'doc',
      text: `${fileName} uploaded by ${clientName}`,
    });

    await notifyAdminOfClientActivity({
      projectName: project.name,
      projectId,
      clientName,
      message: `uploaded a new document: "${fileName}"`,
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (err) {
    console.error('Client document upload error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
