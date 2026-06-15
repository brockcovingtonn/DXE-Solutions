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

// Upserts utility rows for a project (one per utility_type) - contact info + enabled flag
export async function PUT(request) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, utilities } = body;

    if (!projectId || !Array.isArray(utilities)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    for (const u of utilities) {
      const { error } = await supabase
        .from('project_utilities')
        .upsert(
          {
            project_id: projectId,
            utility_type: u.utility_type,
            enabled: !!u.enabled,
            contact_trade: u.contact_trade || null,
            contact_name: u.contact_name || null,
            contact_phone: u.contact_phone || null,
            contact_email: u.contact_email || null,
            contact_comments: u.contact_comments || null,
          },
          { onConflict: 'project_id,utility_type' }
        );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update utilities error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
