import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { notifyAdminOfClientActivity } from '@/lib/email-notifications';
import { sendPushToUser } from '@/lib/push-notifications';

// Client decline on a proposal — mirrors app/api/proposals/[id]/sign/route.js's
// shape exactly (same RLS-scoped client, same "no separate auth check needed
// beyond the policies" reasoning), just without a signature/PDF to generate.
export async function POST(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const reason = body.reason?.trim() || null;

    const proposalId = params.id;

    const { data: proposal } = await supabase
      .from('proposals')
      .select('*, projects(name)')
      .eq('id', proposalId)
      .single();

    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: existingSignature } = await supabase
      .from('proposal_signatures')
      .select('id')
      .eq('proposal_id', proposalId)
      .maybeSingle();

    if (existingSignature) {
      return NextResponse.json({ error: 'This proposal has already been signed' }, { status: 400 });
    }

    const { data: existingDecline } = await supabase
      .from('proposal_declines')
      .select('id')
      .eq('proposal_id', proposalId)
      .maybeSingle();

    if (existingDecline) {
      return NextResponse.json({ error: 'This proposal has already been declined' }, { status: 400 });
    }

    const { data: decline, error: insertError } = await supabase
      .from('proposal_declines')
      .insert({ proposal_id: proposalId, declined_by: user.id, reason })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // proposals.declined_at is set by a trigger on this insert (see
    // proposal_decline_migration.sql) — clients have no UPDATE policy
    // on proposals itself, so that has to happen server-side.

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();
    const actorName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Someone';

    await supabase.from('activity').insert({
      project_id: proposal.project_id,
      type: 'proposal',
      text: `"${proposal.title}" was declined by ${actorName}${reason ? ` — ${reason}` : ''}`,
    });

    await notifyAdminOfClientActivity({
      projectName: proposal.projects?.name || 'a project',
      projectId: proposal.project_id,
      clientName: actorName,
      message: `declined the proposal "${proposal.title}"${reason ? ` — ${reason}` : ''}`,
    });

    try {
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
      await Promise.all(
        (admins || []).map((a) =>
          sendPushToUser(a.id, {
            title: `${proposal.title} — Declined`,
            body: `${actorName} declined this proposal`,
            data: { type: 'proposal', projectId: proposal.project_id },
          })
        )
      );
    } catch (pushErr) {
      console.error('Push notification error (proposal declined):', pushErr);
    }

    return NextResponse.json({ success: true, decline });
  } catch (err) {
    console.error('Decline proposal error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
