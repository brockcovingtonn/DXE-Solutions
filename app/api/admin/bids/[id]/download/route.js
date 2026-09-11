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

  const { data: bid } = await supabase.from('bids').select('pdf_path, title').eq('id', params.id).maybeSingle();
  if (!bid?.pdf_path) return NextResponse.json({ error: 'No PDF for this bid yet' }, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from('project-bids')
    .createSignedUrl(bid.pdf_path, 300, { download: `${bid.title || 'bid'}.pdf` });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.redirect(signed.signedUrl);
}
