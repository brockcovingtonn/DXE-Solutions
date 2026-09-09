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

const ALLOWED_FIELDS = ['description', 'amount', 'status', 'due_date', 'approval_status', 'visible_to_client'];

export async function PATCH(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const update = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) update[key] = body[key];
    }

    if (update.status === 'paid') update.paid_date = new Date().toISOString().slice(0, 10);
    if (update.status === 'unpaid') update.paid_date = null;

    const { error } = await supabase.from('invoices').update(update).eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update invoice error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('file_path')
      .eq('id', params.id)
      .single();

    if (invoice?.file_path) {
      await supabase.storage.from('project-invoices').remove([invoice.file_path]);
    }

    const { error } = await supabase.from('invoices').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete invoice error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
