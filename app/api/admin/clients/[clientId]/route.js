import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

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

// Updates a client's profile (name, email, phone)
export async function PUT(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, emailNotifications } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const update = {
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
    };
    if (typeof emailNotifications === 'boolean') {
      update.email_notifications = emailNotifications;
    }

    const { error } = await supabase.from('profiles').update(update).eq('id', params.clientId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update client error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Deletes a client account. Their projects are kept but detached
// (owner_id set to null) so the project history isn't lost.
export async function DELETE(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const clientId = params.clientId;

  try {
    const admin = createAdminClient();

    // Guard: a client with portal history (uploaded docs, notes, messages,
    // photos) can't be hard-deleted because those rows reference the
    // profile with ON DELETE NO ACTION.
    const [
      { count: docCount },
      { count: noteCount },
      { count: msgCount },
      { count: dmCount },
      { count: photoCount },
    ] = await Promise.all([
      admin.from('documents').select('id', { count: 'exact', head: true }).eq('uploaded_by', clientId),
      admin.from('notes').select('id', { count: 'exact', head: true }).eq('author_id', clientId),
      admin.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', clientId),
      admin.from('messages').select('id', { count: 'exact', head: true }).eq('dm_user_id', clientId),
      admin.from('photos').select('id', { count: 'exact', head: true }).eq('uploaded_by', clientId),
    ]);

    if ((docCount || 0) + (noteCount || 0) + (msgCount || 0) + (dmCount || 0) + (photoCount || 0) > 0) {
      return NextResponse.json(
        {
          error:
            'This client has portal history (documents, notes, messages, or photos) and can’t be deleted. Remove that activity first, or reassign their projects instead.',
        },
        { status: 409 }
      );
    }

    // Detach projects first — projects.owner_id -> profiles is ON DELETE
    // CASCADE, so deleting the profile without this would delete the
    // projects too.
    const { error: detachErr } = await admin
      .from('projects')
      .update({ owner_id: null })
      .eq('owner_id', clientId);
    if (detachErr) {
      return NextResponse.json({ error: detachErr.message }, { status: 400 });
    }

    const { error: profileErr } = await admin.from('profiles').delete().eq('id', clientId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    // Best-effort auth user removal — the profile row is already gone.
    const { error: authDelErr } = await admin.auth.admin.deleteUser(clientId);
    if (authDelErr) {
      console.error('Delete client: auth user removal failed (profile already removed):', authDelErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
