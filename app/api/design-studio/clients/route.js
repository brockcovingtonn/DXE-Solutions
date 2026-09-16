import { randomBytes } from 'crypto';
import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

// Client picker for "new project" when attaching a scan, and for the quote
// builder's client selector — projects and quotes both need a real owner.
// Only real clients (not staff), matching the picker's purpose.
export async function GET(request) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    const db = supabaseAdmin();
    let query = db
      .from('profiles')
      .select('id, first_name, last_name, email, phone')
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
      phone: c.phone || null,
    }));

    return Response.json({ clients });
  } catch (err) {
    return jsonError(err);
  }
}

// Creates a client account only — no project, unlike api/admin/clients,
// since a Design Studio quote precedes a project by design. The client gets
// a random password now and sets their own later via the existing
// /forgot-password flow, once (if) the project moves forward.
export async function POST(request) {
  try {
    await requireStaff(request);
    const body = await request.json();
    const firstName = (body.firstName || '').trim();
    const lastName = (body.lastName || '').trim();
    const email = (body.email || '').trim();
    const phone = (body.phone || '').trim();

    if (!firstName || !email) {
      const e = new Error('First name and email are required');
      e.status = 400;
      throw e;
    }

    const db = supabaseAdmin();
    const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password: randomBytes(24).toString('hex'),
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (createError) {
      const e = new Error(
        createError.message?.includes('already been registered')
          ? 'A client with this email already has an account — search for them instead.'
          : createError.message
      );
      e.status = 400;
      throw e;
    }

    const userId = created.user.id;
    const { error: profileError } = await db
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, phone: phone || null })
      .eq('id', userId);
    if (profileError) throw profileError;

    return Response.json(
      { client: { id: userId, name: [firstName, lastName].filter(Boolean).join(' '), email, phone: phone || null } },
      { status: 201 }
    );
  } catch (err) {
    return jsonError(err);
  }
}
