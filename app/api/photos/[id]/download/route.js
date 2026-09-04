import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';

export async function GET(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: photo } = await supabase
    .from('photos')
    .select('file_path, project_id')
    .eq('id', params.id)
    .single();

  if (!photo) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const project = await getViewableProject(supabase, photo.project_id, user, 'id');
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from('project-photos')
    .createSignedUrl(photo.file_path, 60, { download: true });

  if (error || !data) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
