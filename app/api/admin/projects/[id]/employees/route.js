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

// Replaces all employee assignments for a project with the provided list
export async function PUT(request, { params }) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { employeeIds } = body;

    if (!Array.isArray(employeeIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error: delError } = await supabase
      .from('project_employees')
      .delete()
      .eq('project_id', params.id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 });
    }

    if (employeeIds.length > 0) {
      const { error: insError } = await supabase.from('project_employees').insert(
        employeeIds.map((employeeId) => ({ project_id: params.id, employee_id: employeeId }))
      );

      if (insError) {
        return NextResponse.json({ error: insError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update project employees error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
