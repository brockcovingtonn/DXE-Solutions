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

// Replaces all project assignments for an employee with the provided list
export async function PUT(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectIds } = body;

    if (!Array.isArray(projectIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error: delError } = await supabase
      .from('project_employees')
      .delete()
      .eq('employee_id', params.employeeId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 });
    }

    if (projectIds.length > 0) {
      const { error: insError } = await supabase.from('project_employees').insert(
        projectIds.map((projectId) => ({ project_id: projectId, employee_id: params.employeeId }))
      );

      if (insError) {
        return NextResponse.json({ error: insError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update employee projects error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
