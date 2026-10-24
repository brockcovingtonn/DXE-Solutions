import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { notifyClientOfProjectUpdate } from '@/lib/email-notifications';
import { sendPushToUser } from '@/lib/push-notifications';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);
}

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

export async function POST(request) {
  const { supabase, user } = await getRequestClient(request);
  const { error: authError } = await requireAdmin(supabase, user);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { projectId, kind, description, amount, dueDate, paidDate, invoiceId, filePath, fileName } = body;

    const isReceipt = kind === 'receipt';
    const isPayment = kind === 'payment';

    if (!projectId || !amount || (!isPayment && !description?.trim())) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (isPayment && !invoiceId) {
      return NextResponse.json({ error: 'Missing invoice to apply this payment to' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        project_id: projectId,
        kind: isPayment ? 'payment' : isReceipt ? 'receipt' : 'invoice',
        description: description?.trim() || (isPayment ? 'Payment' : ''),
        amount,
        status: isReceipt || isPayment ? 'paid' : 'unpaid',
        due_date: !isReceipt && !isPayment ? dueDate || null : null,
        paid_date: isReceipt || isPayment ? paidDate || today : null,
        invoice_id: isPayment ? invoiceId : null,
        // A payment must be readable by the client under RLS (which
        // requires visible_to_client = true) — the remaining-balance
        // math in the client portal and the Stripe pay route both read
        // payment rows as the authenticated client, not as an admin.
        visible_to_client: isPayment ? true : undefined,
        file_path: filePath || null,
        file_name: fileName || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // A payment that brings the parent invoice's balance to zero (or
    // past it) marks that invoice paid, same as the admin's manual
    // paid-toggle — so an invoice fully settled via partial payments
    // doesn't just sit there showing "$0 remaining" but still "Unpaid".
    if (isPayment) {
      const { data: parent } = await supabase
        .from('invoices')
        .select('amount, status, description')
        .eq('id', invoiceId)
        .single();

      if (parent && parent.status !== 'paid') {
        const { data: payments } = await supabase
          .from('invoices')
          .select('amount')
          .eq('invoice_id', invoiceId)
          .eq('kind', 'payment');

        const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        if (totalPaid >= Number(parent.amount)) {
          await supabase.from('invoices').update({ status: 'paid', paid_date: today }).eq('id', invoiceId);
        }
      }

      // Let the client know a payment was recorded — the Stripe webhook
      // path already does this for online payments, but a manual entry
      // (check, cash) had no client-facing notification at all.
      const { data: project } = await supabase
        .from('projects')
        .select('name, owner_id, profiles!projects_owner_id_fkey(email, email_notifications)')
        .eq('id', projectId)
        .single();

      if (project?.profiles?.email) {
        await notifyClientOfProjectUpdate({
          clientEmail: project.profiles.email,
          clientNotificationsEnabled: project.profiles.email_notifications,
          projectName: project.name,
          projectId,
          message: `A payment of ${formatCurrency(amount)} was recorded on "${parent?.description || 'your invoice'}".`,
        });
      }

      if (project?.owner_id) {
        try {
          await sendPushToUser(project.owner_id, {
            title: `${project.name} — Payment Received`,
            body: `A payment of ${formatCurrency(amount)} was recorded on "${parent?.description || 'your invoice'}".`,
            data: { type: 'payment', projectId },
          });
        } catch (pushErr) {
          console.error('Push notification error (payment applied):', pushErr);
        }
      }
    }

    return NextResponse.json({ success: true, invoice });
  } catch (err) {
    console.error('Create invoice error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
