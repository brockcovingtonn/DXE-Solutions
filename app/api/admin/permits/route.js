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

export async function POST(request) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, permit_type, permit_number, agency, status, submitted_date, issued_date, expiration_date, notes } = body;

    if (!projectId || !permit_type?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: permit, error } = await supabase
      .from('permits')
      .insert({
        project_id: projectId,
        permit_type: permit_type.trim(),
        permit_number: permit_number || null,
        agency: agency || null,
        status: status || 'not_started',
        submitted_date: submitted_date || null,
        issued_date: issued_date || null,
        expiration_date: expiration_date || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, permit });
  } catch (err) {
    console.error('Create permit error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
