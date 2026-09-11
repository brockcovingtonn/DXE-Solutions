import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { generateProposalPdf } from '@/lib/proposal-pdf';
import { sendProposalEmail } from '@/lib/email-notifications';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

function slugify(str) {
  return String(str || 'proposal')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

// Generates the proposal PDF, stores it, and (optionally) emails it.
// Works both for the first "Finalize" and for re-sending an already
// finalized proposal — each call regenerates the PDF from current data
// and overwrites the stored copy.
export async function POST(request, { params }) {
  const { supabase } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { data: proposal } = await supabase.from('proposals').select('*, projects(name)').eq('id', params.id).maybeSingle();
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  const { data: lineItems } = await supabase
    .from('proposal_line_items')
    .select('*')
    .eq('proposal_id', params.id)
    .order('sort_order');

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json({ error: 'Add at least one line item before finalizing.' }, { status: 400 });
  }
  if (!proposal.client_name?.trim() || !proposal.project_address?.trim()) {
    return NextResponse.json({ error: 'Client name and project address are required.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { sendEmail, recipientEmail } = body;

  let pdfBytes;
  try {
    pdfBytes = await generateProposalPdf(proposal, lineItems);
  } catch (err) {
    console.error('generateProposalPdf error:', err);
    return NextResponse.json({ error: 'Could not generate the proposal PDF.' }, { status: 500 });
  }

  const fileName = `${slugify(proposal.title)}.pdf`;
  const storagePath = `${proposal.project_id}/${proposal.id}-${Date.now()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('project-proposals')
    .upload(storagePath, Buffer.from(pdfBytes), { contentType: 'application/pdf' });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  // Clean up the previous PDF, if any, now that the new one is uploaded.
  if (proposal.pdf_path) {
    await supabase.storage.from('project-proposals').remove([proposal.pdf_path]);
  }

  const nowIso = new Date().toISOString();
  const update = {
    status: 'finalized',
    pdf_path: storagePath,
    finalized_at: proposal.finalized_at || nowIso,
    updated_at: nowIso,
  };

  let emailResult = null;
  if (sendEmail && recipientEmail) {
    emailResult = await sendProposalEmail({
      toEmail: recipientEmail,
      clientName: proposal.client_name,
      proposalTitle: proposal.title,
      projectName: proposal.projects?.name,
      projectId: proposal.project_id,
      total: proposal.total,
      pdfBytes,
      fileName,
    });
    if (emailResult?.error) {
      return NextResponse.json({ error: 'Proposal was saved but the email failed to send. You can try sending again.' }, { status: 502 });
    }
    if (!emailResult?.skipped) {
      update.status = 'sent';
      update.sent_at = nowIso;
      update.sent_to_email = recipientEmail;
      update.visible_to_client = true;
    }
  }

  const { error: updateError } = await supabase.from('proposals').update(update).eq('id', params.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  const { data: signed } = await supabase.storage.from('project-proposals').createSignedUrl(storagePath, 3600);

  return NextResponse.json({
    success: true,
    status: update.status,
    pdfUrl: signed?.signedUrl || null,
    emailSkipped: Boolean(emailResult?.skipped),
  });
}
