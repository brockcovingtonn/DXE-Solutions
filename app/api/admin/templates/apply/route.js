import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

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

// Copies a template file into a project's documents
export async function POST(request) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { templateId, projectId } = body;

    if (!templateId || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: template } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const adminClient = createAdminClient();

    // Download the template file from the templates bucket
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('document-templates')
      .download(template.file_path);

    if (downloadError) {
      return NextResponse.json({ error: downloadError.message }, { status: 400 });
    }

    // Upload a copy into the project's documents bucket
    const newFilePath = `${projectId}/${Date.now()}-${template.file_name}`;

    const { error: uploadError } = await adminClient.storage
      .from('project-documents')
      .upload(newFilePath, fileData, {
        contentType: fileData.type || undefined,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    // Create the documents row
    const { data: doc, error: insertError } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        file_name: template.file_name,
        file_path: newFilePath,
        file_type: template.file_name.split('.').pop(),
        badge: 'new',
        uploaded_by_role: 'dxe',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (err) {
    console.error('Apply template error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
