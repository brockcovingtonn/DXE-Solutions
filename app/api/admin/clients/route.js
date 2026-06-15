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
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      projectName,
      address,
      projectType,
      startedOn,
      estimatedCompletion,
    } = body;

    if (!firstName || !lastName || !email || !password || !projectName) {
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
    // Update it with phone (and ensure names are set correctly).
    await admin
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, phone: phone || null })
      .eq('id', newUserId);

    // 3. Create their first project
    const { data: project, error: projectError } = await admin
      .from('projects')
      .insert({
        owner_id: newUserId,
        name: projectName,
        address: address || null,
        project_type: projectType || null,
        started_on: startedOn || null,
        estimated_completion: estimatedCompletion || null,
        progress_pct: 0,
        status: 'planning',
      })
      .select()
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 400 });
    }

    // 4. Seed default phases for the new project
    const defaultPhases = ['Pre-Design', 'Permits', 'Site Work', 'Framing', 'MEP', 'Finish'];
    await admin.from('project_phases').insert(
      defaultPhases.map((name, i) => ({
        project_id: project.id,
        name,
        pct: 0,
        sort_order: i + 1,
        state: i === 0 ? 'active' : 'pending',
      }))
    );

    // 5. Log a kickoff activity item
    await admin.from('activity').insert({
      project_id: project.id,
      type: 'status',
      text: `Project created: ${projectName}`,
    });

    return NextResponse.json({ success: true, projectId: project.id, userId: newUserId });
  } catch (err) {
    console.error('Create client error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
