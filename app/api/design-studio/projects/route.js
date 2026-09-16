import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

// A project search scoped to design-studio's own staff gate rather than
// each employee's assignment-scoped RLS — any design-studio user can
// already build a quote for any client (there's no project link at all
// until a scan is attached), so search shouldn't be narrower than that
// once one is.
export async function GET(request) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    const db = supabaseAdmin();
    let query = db
      .from('projects')
      .select('id, name, address, owner_id, profiles!projects_owner_id_fkey(first_name, last_name)')
      .order('name')
      .limit(20);

    if (q && q.length >= 2) {
      const like = `%${q.replace(/[%_]/g, '\\$&')}%`;
      query = query.or(`name.ilike.${like},address.ilike.${like}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const projects = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      ownerName: [p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(' ') || null,
    }));

    return Response.json({ projects });
  } catch (err) {
    return jsonError(err);
  }
}
