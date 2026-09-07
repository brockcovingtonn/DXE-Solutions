import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { getViewableProject, getProjectRoster } from '@/lib/project-access';

// Staff (admin + assigned employees) on a project — powers the
// "tag an employee" picker when adding a calendar event or action item.
// Excludes the client; callers must be able to view the project
// themselves (admin, owning client, or an assigned employee).
export async function GET(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await getViewableProject(supabase, params.id, user, 'id');
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const roster = await getProjectRoster(supabase, params.id);
  const staff = roster
    .filter((p) => p.role !== 'client')
    .map((p) => ({ id: p.id, first_name: p.first_name, last_name: p.last_name, role: p.role }));

  return NextResponse.json({ staff });
}
