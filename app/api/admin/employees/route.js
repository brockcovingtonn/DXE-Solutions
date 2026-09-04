import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, email, password, phone } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Create the auth user (auto-confirmed so they can log in immediately)
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const newUserId = newUser.user.id;

    // 2. The handle_new_user trigger creates a profiles row automatically.
    // Update it with phone and flag the account as an employee.
    const { error: updateError } = await admin
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, phone: phone || null, is_employee: true })
      .eq('id', newUserId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, employeeId: newUserId });
  } catch (err) {
    console.error('Create employee error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
