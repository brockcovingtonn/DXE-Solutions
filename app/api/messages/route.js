import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { getProjectRoster } from '@/lib/project-access';
import { sendPushToUser } from '@/lib/push-notifications';

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
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { projectId, dmUserId, text, attachmentPath, attachmentName, attachmentType } = body;

    if ((!projectId && !dmUserId) || (!text?.trim() && !attachmentPath)) {
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
        body: text?.trim() || '',
        attachment_path: attachmentPath || null,
        attachment_name: attachmentName || null,
        attachment_type: attachmentType || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Push the other side(s) of this thread — never the sender.
    try {
      let recipientIds = [];

      if (insertProjectId) {
        const roster = await getProjectRoster(supabase, insertProjectId);
        recipientIds = roster.map((p) => p.id).filter((id) => id !== user.id);
      } else if (senderRole === 'admin') {
        recipientIds = [insertDmUserId];
      } else {
        const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
        recipientIds = (admins || []).map((a) => a.id);
      }

      const pushBody = text?.trim() ? text.trim().slice(0, 140) : `📎 ${attachmentName || 'Attachment'}`;
      await Promise.all(
        recipientIds.map((id) =>
          sendPushToUser(id, {
            title: senderName,
            body: pushBody,
            data: { type: 'message', projectId: insertProjectId, dmUserId: insertDmUserId },
          })
        )
      );
    } catch (pushErr) {
      console.error('Push notification error (message):', pushErr);
    }

    return NextResponse.json({ success: true, message });
  } catch (err) {
    console.error('Send message error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
