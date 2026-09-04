import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Lets a client edit or remove their own review.
export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { rating, body: reviewBody } = body;

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    const update = { updated_at: new Date().toISOString() };
    if (rating !== undefined) update.rating = rating;
    if (reviewBody !== undefined) update.body = reviewBody || null;

    const { error } = await supabase
      .from('reviews')
      .update(update)
      .eq('id', params.id)
      .eq('client_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update review error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', params.id)
      .eq('client_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete review error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
