import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Lets a client submit a review for a project they own. One review per
// project — enforced by a unique constraint, so a client editing their
// existing review should PATCH /api/reviews/[id] instead.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { projectId, rating, body: reviewBody } = body;

    if (!projectId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, project_type')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const clientName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'A DXE client';

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        project_id: projectId,
        client_id: user.id,
        client_name: clientName,
        project_type: project.project_type,
        rating,
        body: reviewBody || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, review });
  } catch (err) {
    console.error('Create review error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
