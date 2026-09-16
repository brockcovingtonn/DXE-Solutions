import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

// Client picker for "new project" when attaching a scan — projects always
// need an owner. Only real clients (not staff), matching the picker's
// purpose.
export async function GET(request) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    const db = supabaseAdmin();
    let query = db
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('is_admin', false)
      .eq('is_employee', false)
      .order('first_name')
      .limit(20);

    if (q && q.length >= 2) {
      const like = `%${q.replace(/[%_]/g, '\\$&')}%`;
      query = query.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const clients = (data || []).map((c) => ({
      id: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email,
      email: c.email,
    }));

    return Response.json({ clients });
  } catch (err) {
    return jsonError(err);
  }
}
