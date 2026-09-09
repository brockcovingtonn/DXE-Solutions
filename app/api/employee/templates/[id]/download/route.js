import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: template } = await supabase
    .from('document_templates')
    .select('file_path, file_name')
    .eq('id', params.id)
    .eq('shared_with_employees', true)
    .single();

  if (!template) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from('document-templates')
    .createSignedUrl(template.file_path, 60, { download: template.file_name || true });

  if (error || !data) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
