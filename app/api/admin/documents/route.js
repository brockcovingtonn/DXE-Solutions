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

// Create a document record (after file has been uploaded to storage by the client)
export async function POST(request) {
  const supabase = createClient();
  const { user, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, fileName, filePath, fileType, badge, logActivity } = body;

    if (!projectId || !fileName || !filePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        uploaded_by_role: 'dxe',
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        badge: badge || 'new',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (logActivity !== false) {
      await supabase.from('activity').insert({
        project_id: projectId,
        type: 'doc',
        text: `${fileName} uploaded by DXE`,
      });
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (err) {
    console.error('Admin document upload error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
