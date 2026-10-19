import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase, user) {
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

export async function POST(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const { data: items } = await supabase.from('scope_items').select('completed').eq('project_id', params.id);

    const pct = items && items.length > 0 ? Math.round((items.filter((i) => i.completed).length / items.length) * 100) : 0;

    const { error } = await supabase
      .from('projects')
      .update({ progress_pct: pct, progress_pct_auto: true })
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, progress_pct: pct });
  } catch (err) {
    console.error('Recalculate progress error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
