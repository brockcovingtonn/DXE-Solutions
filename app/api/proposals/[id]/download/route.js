import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';

// Client/employee/admin download — RLS on `proposals` already keeps a
// client from reaching a draft or another client's project, this just
// confirms the caller can view the project at all before signing a URL.
export async function GET(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: proposal } = await supabase
    .from('proposals')
    .select('pdf_path, title, project_id')
    .eq('id', params.id)
    .single();

  if (!proposal || !proposal.pdf_path) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const project = await getViewableProject(supabase, proposal.project_id, user, 'id');
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from('project-proposals')
    .createSignedUrl(proposal.pdf_path, 300);

  if (error || !data) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
