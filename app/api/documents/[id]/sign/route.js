import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { stampSignatureOntoPdf } from '@/lib/pdf-signature';
import { notifyAdminOfClientActivity } from '@/lib/email-notifications';
import { sendPushToUser } from '@/lib/push-notifications';

// Client- or employee-authored e-signature. Only PDF documents can be
// signed (the signature is stamped onto a new last page); one
// signature per document (enforced by a unique index on
// document_signatures.document_id). Authorization is RLS-driven: the
// caller's own client can only ever see/sign documents on a project
// they own (client) or are assigned to (employee).
export async function POST(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { signatureDataUrl, signerName } = body;

    if (!signatureDataUrl || !signerName?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const documentId = params.id;

    const { data: doc } = await supabase
      .from('documents')
      .select('id, project_id, file_path, file_name, file_type, projects(name)')
      .eq('id', documentId)
      .single();

    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isPdf = (doc.file_type || '').toLowerCase() === 'pdf' || doc.file_name?.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json({ error: 'Only PDF documents can be signed' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('document_signatures')
      .select('id')
      .eq('document_id', documentId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This document has already been signed' }, { status: 400 });
    }

    const base64 = signatureDataUrl.includes(',') ? signatureDataUrl.split(',')[1] : signatureDataUrl;
    const signaturePngBytes = Buffer.from(base64, 'base64');

    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('project-documents')
      .download(doc.file_path);

    if (downloadError || !pdfBlob) {
      return NextResponse.json({ error: 'Could not read the original document' }, { status: 400 });
    }
    const pdfBytes = Buffer.from(await pdfBlob.arrayBuffer());

    const signedAt = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
    let stampedPdfBytes;
    try {
      stampedPdfBytes = await stampSignatureOntoPdf({
        pdfBytes,
        signaturePngBytes,
        signerName: signerName.trim(),
        signedAt,
      });
    } catch (stampErr) {
      console.error('PDF stamping error:', stampErr);
      return NextResponse.json({ error: 'Could not process this PDF for signing' }, { status: 400 });
    }

    const timestamp = Date.now();
    const signaturePath = `${documentId}/signature-${timestamp}.png`;
    const signedPdfPath = `${documentId}/signed-${timestamp}.pdf`;

    const { error: sigUploadError } = await supabase.storage
      .from('document-signatures')
      .upload(signaturePath, signaturePngBytes, { contentType: 'image/png' });
    if (sigUploadError) {
      return NextResponse.json({ error: sigUploadError.message }, { status: 400 });
    }

    const { error: pdfUploadError } = await supabase.storage
      .from('document-signatures')
      .upload(signedPdfPath, Buffer.from(stampedPdfBytes), { contentType: 'application/pdf' });
    if (pdfUploadError) {
      return NextResponse.json({ error: pdfUploadError.message }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = request.headers.get('user-agent') || null;

    const { data: signature, error: insertError } = await supabase
      .from('document_signatures')
      .insert({
        document_id: documentId,
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();
    const actorName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Someone';

    await supabase.from('activity').insert({
      project_id: doc.project_id,
      type: 'doc',
      text: `${doc.file_name} was signed by ${actorName}`,
    });

    await notifyAdminOfClientActivity({
      projectName: doc.projects?.name || 'a project',
      projectId: doc.project_id,
      clientName: actorName,
      message: `signed "${doc.file_name}"`,
    });

    try {
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
      await Promise.all(
        (admins || []).map((a) =>
          sendPushToUser(a.id, {
            title: `${doc.file_name} — Signed`,
            body: `${actorName} signed this document`,
            data: { type: 'doc', projectId: doc.project_id },
          })
        )
      );
    } catch (pushErr) {
      console.error('Push notification error (document signed):', pushErr);
    }

    return NextResponse.json({ success: true, signature });
  } catch (err) {
    console.error('Sign document error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
