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

export async function POST(request) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, name } = body;

    if (!projectId || !name?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { count } = await supabase
      .from('scope_areas')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const { data: area, error } = await supabase
      .from('scope_areas')
      .insert({ project_id: projectId, name: name.trim(), sort_order: count || 0 })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, area: { ...area, scope_items: [] } });
  } catch (err) {
    console.error('Create scope area error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
