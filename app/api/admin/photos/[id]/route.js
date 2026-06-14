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

export async function DELETE(request, { params }) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const { data: photo } = await supabase
      .from('photos')
      .select('file_path')
      .eq('id', params.id)
      .single();

    if (photo?.file_path) {
      await supabase.storage.from('project-photos').remove([photo.file_path]);
    }

    const { error } = await supabase.from('photos').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
