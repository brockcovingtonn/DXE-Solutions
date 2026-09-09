import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

// Employee-submitted accounting entries — a reimbursement (employee's
// own out-of-pocket expense) or a receipt (a project-related expense
// DXE covered). Always lands as approval_status='pending'; only an
// admin can approve/reject or share it with the client. RLS further
// restricts the insert to projects the employee is actually assigned
// to (see employee_accounting_templates_migration.sql).
async function requireEmployee(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_employee')
    .eq('id', user.id)
    .single();

  if (!profile?.is_employee) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user };
}

const ALLOWED_KINDS = ['reimbursement', 'receipt'];

export async function POST(request) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireEmployee(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, kind, description, amount, filePath, fileName } = body;

    if (!projectId || !description?.trim() || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const resolvedKind = ALLOWED_KINDS.includes(kind) ? kind : 'reimbursement';

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        project_id: projectId,
        kind: resolvedKind,
        description: description.trim(),
        amount,
        status: 'paid',
        paid_date: new Date().toISOString().slice(0, 10),
        approval_status: 'pending',
        visible_to_client: false,
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
    console.error('Create employee invoice error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
