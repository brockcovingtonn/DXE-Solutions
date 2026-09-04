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

export async function POST(request) {
  const supabase = createClient();
  const { user, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, kind, description, amount, dueDate, filePath, fileName } = body;

    if (!projectId || !description?.trim() || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isReceipt = kind === 'receipt';

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        project_id: projectId,
        kind: isReceipt ? 'receipt' : 'invoice',
        description: description.trim(),
        amount,
        status: isReceipt ? 'paid' : 'unpaid',
        due_date: !isReceipt ? dueDate || null : null,
        paid_date: isReceipt ? new Date().toISOString().slice(0, 10) : null,
        file_path: filePath || null,
        file_name: fileName || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (err) {
    console.error('Create invoice error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
