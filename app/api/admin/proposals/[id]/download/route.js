import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

export async function GET(request, { params }) {
  const { supabase } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { data: proposal } = await supabase.from('proposals').select('pdf_path, title').eq('id', params.id).maybeSingle();
  if (!proposal?.pdf_path) return NextResponse.json({ error: 'No PDF for this proposal yet' }, { status: 404 });

  // Once signed, the countersigned PDF is the authoritative version.
  const { data: signature } = await supabase
    .from('proposal_signatures')
    .select('signed_pdf_path')
    .eq('proposal_id', params.id)
    .maybeSingle();

  const downloadOption = { download: `${proposal.title || 'proposal'}.pdf` };
  const { data: signedUrl, error } = signature
    ? await supabase.storage.from('proposal-signatures').createSignedUrl(signature.signed_pdf_path, 300, downloadOption)
    : await supabase.storage.from('project-proposals').createSignedUrl(proposal.pdf_path, 300, downloadOption);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.redirect(signedUrl.signedUrl);
}
