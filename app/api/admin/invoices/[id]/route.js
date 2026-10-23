import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

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

const ALLOWED_FIELDS = ['description', 'amount', 'status', 'due_date', 'paid_date', 'approval_status', 'visible_to_client'];

// Re-derives whether an invoice is fully paid from its linked payment
// rows (amount - sum of kind='payment' rows pointing at it), and flips
// `status` to match. Only called right after a payment row tied to this
// invoice was created/edited/removed, or the invoice's own amount
// changed — never for a plain admin paid-toggle with no payment rows,
// so a manual "mark paid" on an invoice with no payments is untouched.
async function recalculateInvoiceStatus(supabase, invoiceId) {
  const { data: invoice } = await supabase.from('invoices').select('amount, status').eq('id', invoiceId).maybeSingle();
  if (!invoice) return;

  const { data: payments } = await supabase.from('invoices').select('amount').eq('invoice_id', invoiceId).eq('kind', 'payment');
  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const fullyPaid = totalPaid >= Number(invoice.amount) && totalPaid > 0;

  if (fullyPaid && invoice.status !== 'paid') {
    await supabase.from('invoices').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', invoiceId);
  } else if (!fullyPaid && invoice.status === 'paid') {
    await supabase.from('invoices').update({ status: 'unpaid', paid_date: null }).eq('id', invoiceId);
  }
}

export async function PATCH(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const update = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) update[key] = body[key];
    }

    if (update.status === 'paid') update.paid_date = new Date().toISOString().slice(0, 10);
    if (update.status === 'unpaid') update.paid_date = null;

    const { data: current } = await supabase.from('invoices').select('kind, invoice_id').eq('id', params.id).maybeSingle();

    const { error } = await supabase.from('invoices').update(update).eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (current?.kind === 'payment' && current.invoice_id && 'amount' in update) {
      await recalculateInvoiceStatus(supabase, current.invoice_id);
    }
    if (current?.kind === 'invoice' && 'amount' in update) {
      await recalculateInvoiceStatus(supabase, params.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update invoice error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('file_path, kind, invoice_id')
      .eq('id', params.id)
      .single();

    if (invoice?.file_path) {
      await supabase.storage.from('project-invoices').remove([invoice.file_path]);
    }

    const { error } = await supabase.from('invoices').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (invoice?.kind === 'payment' && invoice.invoice_id) {
      await recalculateInvoiceStatus(supabase, invoice.invoice_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete invoice error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
