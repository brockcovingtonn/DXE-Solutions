import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

async function requireAdmin(supabase, user) {
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

function csvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Streams a CSV summary of every invoice/receipt/reimbursement across
// all projects, for handing to a tax preparer.
export async function GET(request) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  const { data: entries } = await supabase
    .from('invoices')
    .select('*, projects(name, profiles!projects_owner_id_fkey(first_name, last_name))')
    .order('created_at', { ascending: true });

  const header = ['Date Created', 'Project', 'Client', 'Type', 'Description', 'Amount', 'Status', 'Due Date', 'Paid Date', 'Payment Method'];
  const rows = (entries || []).map((e) => [
    e.created_at ? new Date(e.created_at).toLocaleDateString('en-US') : '',
    e.projects?.name || '',
    e.projects?.profiles ? `${e.projects.profiles.first_name || ''} ${e.projects.profiles.last_name || ''}`.trim() : '',
    e.kind,
    e.description,
    e.amount,
    e.status,
    e.due_date || '',
    e.paid_date || '',
    e.payment_method || e.paid_via || '',
  ]);

  const totalsByKind = {};
  for (const e of entries || []) {
    totalsByKind[e.kind] = (totalsByKind[e.kind] || 0) + Number(e.amount || 0);
  }

  const csvLines = [
    header.map(csvCell).join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
    '',
    ...Object.entries(totalsByKind).map(([kind, total]) => `Total ${kind}s,,,,,${total.toFixed(2)}`),
  ];

  const csv = csvLines.join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="dxe-accounting-summary-${dateStr}.csv"`,
    },
  });
}
