import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { generateProposalPdf } from '@/lib/proposal-pdf';
import { notifyAdminOfClientActivity } from '@/lib/email-notifications';
import { sendPushToUser } from '@/lib/push-notifications';

// Client e-signature on a proposal. Uses the caller's own RLS-scoped
// client throughout (never the admin client) — a client can only ever
// select/sign a proposal that's visible_to_client and non-draft on a
// project they own, per proposal_signature_migration.sql's policies,
// so there's no separate authorization check needed here beyond that.
//
// Unlike document signing (which stamps a confirmation page onto an
// arbitrary uploaded PDF), this regenerates the proposal PDF from its
// own data with the signature drawn directly onto the existing
// Authorization block — see lib/proposal-pdf.js.
export async function POST(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { signatureDataUrl, signerName } = body;

    if (!signatureDataUrl || !signerName?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const proposalId = params.id;

    const { data: proposal } = await supabase
      .from('proposals')
      .select('*, projects(name)')
      .eq('id', proposalId)
      .single();

    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: existing } = await supabase
      .from('proposal_signatures')
      .select('id')
      .eq('proposal_id', proposalId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This proposal has already been signed' }, { status: 400 });
    }

    const { data: lineItems } = await supabase
      .from('proposal_line_items')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('sort_order');

    const base64 = signatureDataUrl.includes(',') ? signatureDataUrl.split(',')[1] : signatureDataUrl;
    const signaturePngBytes = Buffer.from(base64, 'base64');
    const signedAt = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

    let signedPdfBytes;
    try {
      signedPdfBytes = await generateProposalPdf(proposal, lineItems, {
        pngBytes: signaturePngBytes,
        signerName: signerName.trim(),
        signedAt,
      });
    } catch (genErr) {
      console.error('Signed proposal PDF generation error:', genErr);
      return NextResponse.json({ error: 'Could not process this proposal for signing' }, { status: 400 });
    }

    const timestamp = Date.now();
    const signaturePath = `${proposalId}/signature-${timestamp}.png`;
    const signedPdfPath = `${proposalId}/signed-${timestamp}.pdf`;

    const { error: sigUploadError } = await supabase.storage
      .from('proposal-signatures')
      .upload(signaturePath, signaturePngBytes, { contentType: 'image/png' });
    if (sigUploadError) {
      return NextResponse.json({ error: sigUploadError.message }, { status: 400 });
    }

    const { error: pdfUploadError } = await supabase.storage
      .from('proposal-signatures')
      .upload(signedPdfPath, Buffer.from(signedPdfBytes), { contentType: 'application/pdf' });
    if (pdfUploadError) {
      return NextResponse.json({ error: pdfUploadError.message }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = request.headers.get('user-agent') || null;

    const { data: signature, error: insertError } = await supabase
      .from('proposal_signatures')
      .insert({
        proposal_id: proposalId,
        signed_by: user.id,
        signer_name: signerName.trim(),
        signature_path: signaturePath,
        signed_pdf_path: signedPdfPath,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // proposals.signed_at is set by a trigger on this insert (see
    // proposal_signature_migration.sql) — clients have no UPDATE
    // policy on proposals itself, so that has to happen server-side.

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();
    const actorName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Someone';

    await supabase.from('activity').insert({
      project_id: proposal.project_id,
      type: 'proposal',
      text: `"${proposal.title}" was signed by ${actorName}`,
    });

    await notifyAdminOfClientActivity({
      projectName: proposal.projects?.name || 'a project',
      projectId: proposal.project_id,
      clientName: actorName,
      message: `signed the proposal "${proposal.title}"`,
    });

    try {
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
      await Promise.all(
        (admins || []).map((a) =>
          sendPushToUser(a.id, {
            title: `${proposal.title} — Signed`,
            body: `${actorName} signed this proposal`,
            data: { type: 'proposal', projectId: proposal.project_id },
          })
        )
      );
    } catch (pushErr) {
      console.error('Push notification error (proposal signed):', pushErr);
    }

    return NextResponse.json({ success: true, signature });
  } catch (err) {
    console.error('Sign proposal error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
