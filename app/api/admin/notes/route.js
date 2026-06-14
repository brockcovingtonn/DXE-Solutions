import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, first_name, last_name')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user, profile };
}

export async function POST(request) {
  const supabase = createClient();
  const { user, profile, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, text } = body;

    if (!projectId || !text?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const authorName = `${profile.first_name || 'Dixie'} — Project Manager`;

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        project_id: projectId,
        author_id: user.id,
        author_name: authorName,
        author_role: 'dxe',
        body: text.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('activity').insert({
      project_id: projectId,
      type: 'note',
      text: `${authorName.split(' —')[0]} added a note: ${text.trim().slice(0, 100)}${text.trim().length > 100 ? '...' : ''}`,
    });

    return NextResponse.json({ success: true, note });
  } catch (err) {
    console.error('Admin note error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
