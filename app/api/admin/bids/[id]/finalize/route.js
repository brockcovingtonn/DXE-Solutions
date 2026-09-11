import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { generateBidPdf } from '@/lib/bid-pdf';
import { sendBidEmail } from '@/lib/email-notifications';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

function slugify(str) {
  return String(str || 'bid')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

// Generates the bid PDF, stores it, and (optionally) emails it. Works
// both for the first "Finalize" and for re-sending an already-finalized
// bid — each call regenerates the PDF from current data and overwrites
// the stored copy.
export async function POST(request, { params }) {
  const { supabase } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { data: bid } = await supabase.from('bids').select('*, projects(name)').eq('id', params.id).maybeSingle();
  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

  const { data: lineItems } = await supabase
    .from('bid_line_items')
    .select('*')
    .eq('bid_id', params.id)
    .order('sort_order');

  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json({ error: 'Add at least one line item before finalizing.' }, { status: 400 });
  }
  if (!bid.client_name?.trim() || !bid.project_address?.trim()) {
    return NextResponse.json({ error: 'Client name and project address are required.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { sendEmail, recipientEmail } = body;

  let pdfBytes;
  try {
    pdfBytes = await generateBidPdf(bid, lineItems);
  } catch (err) {
    console.error('generateBidPdf error:', err);
    return NextResponse.json({ error: 'Could not generate the bid PDF.' }, { status: 500 });
  }

  const fileName = `${slugify(bid.title)}.pdf`;
  const storagePath = `${bid.project_id}/${bid.id}-${Date.now()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('project-bids')
    .upload(storagePath, Buffer.from(pdfBytes), { contentType: 'application/pdf' });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  // Clean up the previous PDF, if any, now that the new one is uploaded.
  if (bid.pdf_path) {
    await supabase.storage.from('project-bids').remove([bid.pdf_path]);
  }

  const nowIso = new Date().toISOString();
  const update = {
    status: 'finalized',
    pdf_path: storagePath,
    finalized_at: bid.finalized_at || nowIso,
    updated_at: nowIso,
  };

  let emailResult = null;
  if (sendEmail && recipientEmail) {
    emailResult = await sendBidEmail({
      toEmail: recipientEmail,
      clientName: bid.client_name,
      bidTitle: bid.title,
      projectName: bid.projects?.name,
      total: bid.total,
      pdfBytes,
      fileName,
    });
    if (emailResult?.error) {
      return NextResponse.json({ error: 'Bid was saved but the email failed to send. You can try sending again.' }, { status: 502 });
    }
    if (!emailResult?.skipped) {
      update.status = 'sent';
      update.sent_at = nowIso;
      update.sent_to_email = recipientEmail;
    }
  }

  const { error: updateError } = await supabase.from('bids').update(update).eq('id', params.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  const { data: signed } = await supabase.storage.from('project-bids').createSignedUrl(storagePath, 3600);

  return NextResponse.json({
    success: true,
    status: update.status,
    pdfUrl: signed?.signedUrl || null,
    emailSkipped: Boolean(emailResult?.skipped),
  });
}
