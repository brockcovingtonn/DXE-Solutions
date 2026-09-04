import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getProjectRoster } from '@/lib/project-access';

// Lazily loads one thread's message history + participant roster for
// the floating chat widget, so the page that renders the widget only
// ever needs a lightweight list of available threads up front.
export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const dmUserId = searchParams.get('dmUserId');

  if (!projectId && !dmUserId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_employee')
    .eq('id', user.id)
    .single();

  let allowed = false;
  let participants = [];

  if (projectId) {
    if (profile?.is_admin) {
      allowed = true;
    } else if (profile?.is_employee) {
      const { data: assignment } = await supabase
        .from('project_employees')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('employee_id', user.id)
        .maybeSingle();
      allowed = !!assignment;
    } else {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('owner_id', user.id)
        .single();
      allowed = !!project;
    }

    if (allowed) participants = await getProjectRoster(supabase, projectId);
  } else {
    // DM thread: admins can open anyone's; everyone else can only open
    // their own (the widget never even offers another id, but enforce
    // it server-side too).
    if (profile?.is_admin || dmUserId === user.id) {
      allowed = true;

      if (profile?.is_admin && dmUserId !== user.id) {
        const { data: other } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', dmUserId)
          .single();
        if (other) participants = [other];
      } else {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('is_admin', true);
        participants = (admins || []).map((a) => ({ ...a, role: 'admin' }));
      }
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
  query = projectId ? query.eq('project_id', projectId) : query.eq('dm_user_id', dmUserId).is('project_id', null);

  const { data: messages } = await query;

  return NextResponse.json({ messages: messages || [], participants });
}
