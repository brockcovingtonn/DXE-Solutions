import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { notifyClientOfProjectUpdate } from '@/lib/email-notifications';

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

export async function POST(request) {
  const supabase = createClient();
  const { user, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, filePath, caption, logActivity, photoCount } = body;

    if (!projectId || !filePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: photo, error } = await supabase
      .from('photos')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        file_path: filePath,
        caption: caption || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (logActivity) {
      const count = photoCount || 1;
      await supabase.from('activity').insert({
        project_id: projectId,
        type: 'photo',
        text: `${count} new progress photo${count === 1 ? '' : 's'} added${caption ? ` — ${caption}` : ''}`,
      });

      // Notify the client of the new photos
      const { data: project } = await supabase
        .from('projects')
        .select('name, profiles!projects_owner_id_fkey(email, email_notifications)')
        .eq('id', projectId)
        .single();

      if (project?.profiles?.email) {
        await notifyClientOfProjectUpdate({
          clientEmail: project.profiles.email,
          clientNotificationsEnabled: project.profiles.email_notifications,
          projectName: project.name,
          projectId,
          message: `${count} new progress photo${count === 1 ? '' : 's'} ${count === 1 ? 'was' : 'were'} added to your project${caption ? ` — ${caption}` : ''}.`,
        });
      }
    }

    return NextResponse.json({ success: true, photo });
  } catch (err) {
    console.error('Admin photo upload error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
