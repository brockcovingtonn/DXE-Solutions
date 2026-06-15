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

// Creates a new utility entry
export async function POST(request) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { utilityId, application, work_request_number, status, action_step, comments } = body;

    if (!utilityId) {
      return NextResponse.json({ error: 'Missing utility ID' }, { status: 400 });
    }

    // Determine next sort order
    const { data: existing } = await supabase
      .from('project_utility_entries')
      .select('sort_order')
      .eq('utility_id', utilityId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data: entry, error } = await supabase
      .from('project_utility_entries')
      .insert({
        utility_id: utilityId,
        application: application || null,
        work_request_number: work_request_number || null,
        status: status || 'not_ready',
        action_step: action_step || null,
        comments: comments || null,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, entry });
  } catch (err) {
    console.error('Create utility entry error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
