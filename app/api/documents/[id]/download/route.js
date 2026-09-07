import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';

export async function GET(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('file_path, file_name, project_id')
    .eq('id', params.id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const project = await getViewableProject(supabase, doc.project_id, user, 'id');
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Once signed, the stamped PDF (with the signature page) is the
  // authoritative version everyone should see when downloading.
  const { data: signature } = await supabase
    .from('document_signatures')
    .select('signed_pdf_path')
    .eq('document_id', params.id)
    .maybeSingle();

  const { data, error } = signature
    ? await supabase.storage
        .from('document-signatures')
        .createSignedUrl(signature.signed_pdf_path, 60, { download: doc.file_name || true })
    : await supabase.storage
        .from('project-documents')
        .createSignedUrl(doc.file_path, 60, { download: doc.file_name || true });

  if (error || !data) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
