import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

// Creates a new contact, optionally linking it to projects
export async function POST(request) {
  const supabase = createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, company, trade, phone, email, notes, projectIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        name,
        company: company || null,
        trade: trade || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (Array.isArray(projectIds) && projectIds.length > 0) {
      const { error: linkError } = await supabase.from('project_contacts').insert(
        projectIds.map((projectId) => ({ project_id: projectId, contact_id: contact.id }))
      );

      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, contact });
  } catch (err) {
    console.error('Create contact error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
