import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase, user) {
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

export async function PUT(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, company, trade, phone, email, website, notes, projectIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('contacts')
      .update({
        name,
        company: company || null,
        trade: trade || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        notes: notes || null,
      })
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (Array.isArray(projectIds)) {
      // Replace project links
      await supabase.from('project_contacts').delete().eq('contact_id', params.id);

      if (projectIds.length > 0) {
        const { error: linkError } = await supabase.from('project_contacts').insert(
          projectIds.map((projectId) => ({ project_id: projectId, contact_id: params.id }))
        );

        if (linkError) {
          return NextResponse.json({ error: linkError.message }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update contact error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const { error } = await supabase.from('contacts').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete contact error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
