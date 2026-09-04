import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Single send-message endpoint for both thread types:
//  - Project threads (projectId set): client + admins + assigned
//    employees, exactly like every other project-scoped feature.
//  - Direct-message threads (dmUserId set): a private line between one
//    client-or-employee and admin. Admin is implicit — there's no
//    admin id to record, since any admin can read/reply to any DM.
//
// A client or employee can only ever DM as themselves (dm_user_id is
// forced to their own id, ignoring whatever the request sent) — only an
// admin is allowed to target someone else's DM thread.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { projectId, dmUserId, text } = body;

    if ((!projectId && !dmUserId) || !text?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, is_admin, is_employee')
      .eq('id', user.id)
      .single();

    let senderRole = 'client';
    let allowed = false;
    let insertProjectId = null;
    let insertDmUserId = null;

    if (projectId) {
      if (profile?.is_admin) {
        senderRole = 'admin';
        allowed = true;
      } else if (profile?.is_employee) {
        senderRole = 'employee';
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
      insertProjectId = projectId;
    } else {
      if (profile?.is_admin) {
        senderRole = 'admin';
        if (!dmUserId) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        insertDmUserId = dmUserId;
      } else {
        senderRole = profile?.is_employee ? 'employee' : 'client';
        insertDmUserId = user.id;
      }
      allowed = true;
    }

    if (!allowed) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const senderName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'DXE Solutions';

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        project_id: insertProjectId,
        dm_user_id: insertDmUserId,
        sender_id: user.id,
        sender_name: senderName,
        sender_role: senderRole,
        body: text.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message });
  } catch (err) {
    console.error('Send message error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
