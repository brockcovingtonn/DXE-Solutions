import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('file_path, project_id, projects!inner(owner_id)')
    .eq('id', params.id)
    .single();

  if (!doc || doc.projects.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from('project-documents')
    .createSignedUrl(doc.file_path, 60);

  if (error || !data) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
