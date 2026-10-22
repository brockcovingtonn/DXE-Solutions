import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

// A quote's client may already have one or more projects — lets
// QuoteBuilder offer (and auto-pick) which project a quote belongs to.
export async function GET(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();

    const { data, error } = await db
      .from('projects')
      .select('id, name, created_at')
      .eq('owner_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return Response.json({ projects: data || [] });
  } catch (err) {
    return jsonError(err);
  }
}
