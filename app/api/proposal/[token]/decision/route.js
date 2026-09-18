import { supabaseAdmin, jsonError } from '@/lib/design-studio/server';
import { notifyStaffOfProposalDecision } from '@/lib/design-studio/email';

export const dynamic = 'force-dynamic';

const DECISIONS = ['accepted', 'declined'];

// Unauthenticated, reachable only with the quote's share_token — same
// "no login" pattern as app/api/intake/[token]/route.js. The client on
// the public /proposal/[token] page never authenticates, so the token
// itself is the capability that authorizes this write.
export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { decision, signatureDataUrl, signerName, declineReason } = body;

    if (!DECISIONS.includes(decision)) {
      const e = new Error('Unknown decision');
      e.status = 400;
      throw e;
    }

    const db = supabaseAdmin();
    const { data: quote, error } = await db
      .from('design_studio_quotes')
      .select('id, quote_number, client_name, status, share_token')
      .eq('share_token', token)
      .maybeSingle();
    if (error) throw error;
    if (!quote) {
      const e = new Error('Not found');
      e.status = 404;
      throw e;
    }
    if (quote.status === 'accepted' || quote.status === 'declined') {
      const e = new Error('This proposal has already been responded to.');
      e.status = 400;
      throw e;
    }

    const patch = { status: decision, decided_at: new Date().toISOString() };

    if (decision === 'accepted') {
      if (!signatureDataUrl || !signerName?.trim()) {
        const e = new Error('A signature and name are required to approve.');
        e.status = 400;
        throw e;
      }
      const base64 = signatureDataUrl.includes(',') ? signatureDataUrl.split(',')[1] : signatureDataUrl;
      const signaturePngBytes = Buffer.from(base64, 'base64');
      const signaturePath = `${quote.id}/signature-${Date.now()}.png`;

      const { error: uploadError } = await db.storage
        .from('design-studio-scans')
        .upload(signaturePath, signaturePngBytes, { contentType: 'image/png' });
      if (uploadError) throw uploadError;

      patch.signature_path = signaturePath;
      patch.signer_name = signerName.trim();
      patch.signed_at = patch.decided_at;
    } else {
      patch.decline_reason = declineReason?.trim() || null;
    }

    const { error: updateError } = await db.from('design_studio_quotes').update(patch).eq('id', quote.id);
    if (updateError) throw updateError;

    await notifyStaffOfProposalDecision({
      quote: { ...quote, ...patch },
      decision,
      declineReason: patch.decline_reason,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
