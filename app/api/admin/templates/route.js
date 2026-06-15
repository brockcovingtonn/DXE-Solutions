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

// Registers a template after the file has been uploaded to storage
export async function POST(request) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, description, category, filePath, fileName, fileSize } = body;

    if (!name || !filePath || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: template, error } = await supabase
      .from('document_templates')
      .insert({
        name,
        description: description || null,
        category: category || null,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, template });
  } catch (err) {
    console.error('Create template error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
