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

// Updates an employee's profile (name, phone, login email)
export async function PUT(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { firstName, lastName, phone, email } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const admin = createAdminClient();

    // profiles.email is only ever set from auth.users.email by the
    // handle_new_user trigger at signup — changing it here has to go
    // through the auth admin API first, then be mirrored onto the
    // profile so the rest of the app (which reads profiles.email, not
    // auth.users) stays in sync.
    if (email && email.trim()) {
      const trimmedEmail = email.trim();
      const { data: current } = await admin
        .from('profiles')
        .select('email')
        .eq('id', params.employeeId)
        .single();

      if (current?.email !== trimmedEmail) {
        // Checked up front rather than relying on the auth API's own
        // error for a duplicate — that comes back as a generic 500
        // "unexpected_failure" (an internal unique-constraint hit, not
        // a clean validation error), which makes a bad message either way.
        const { data: existing } = await admin
          .from('profiles')
          .select('id')
          .eq('email', trimmedEmail)
          .neq('id', params.employeeId)
          .maybeSingle();

        if (existing) {
          return NextResponse.json({ error: 'That email is already in use by another account.' }, { status: 400 });
        }

        const { error: authUpdateError } = await admin.auth.admin.updateUserById(params.employeeId, {
          email: trimmedEmail,
          email_confirm: true,
        });
        if (authUpdateError) {
          return NextResponse.json({ error: 'Could not update the login email.' }, { status: 400 });
        }
      }
    }

    const update = { first_name: firstName, last_name: lastName, phone: phone || null };
    if (email && email.trim()) update.email = email.trim();

    const { error } = await admin
      .from('profiles')
      .update(update)
      .eq('id', params.employeeId)
      .eq('is_employee', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update employee error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Permanently removes an employee's account and access
export async function DELETE(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(params.employeeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete employee error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
