import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getStripe, paymentMethodLabel } from '@/lib/stripe';
import { notifyAdminOfInvoicePayment } from '@/lib/email-notifications';
import { sendPushToUser } from '@/lib/push-notifications';

export const dynamic = 'force-dynamic';

const today = () => new Date().toISOString().slice(0, 10);

function clientNameOf(invoice) {
  const p = invoice?.projects?.profiles;
  const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
  return name || 'Your client';
}

async function markPaid(admin, invoiceId, { paymentIntentId, method }) {
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, project_id, amount, status, projects(name, owner_id, profiles!projects_owner_id_fkey(first_name, last_name))')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice) return;

  if (invoice.status !== 'paid') {
    await admin
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: today(),
        paid_via: 'stripe',
        payment_method: method || null,
        payment_state: 'idle',
        stripe_payment_intent_id: paymentIntentId || null,
      })
      .eq('id', invoiceId);
  }

  await notifyAdminOfInvoicePayment({
    projectName: invoice.projects?.name || 'a project',
    projectId: invoice.project_id,
    clientName: clientNameOf(invoice),
    amount: Number(invoice.amount),
    method: paymentMethodLabel(method),
    outcome: 'paid',
  });

  if (invoice.projects?.owner_id) {
    try {
      await sendPushToUser(invoice.projects.owner_id, {
        title: 'Payment received',
        body: `Thank you — your payment for "${invoice.projects?.name || 'your project'}" was received.`,
        data: { type: 'invoice', projectId: invoice.project_id },
      });
    } catch (err) {
      console.error('Push (invoice paid) error:', err);
    }
  }
}

async function markProcessing(admin, invoiceId) {
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, project_id, amount, status, projects(name)')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice || invoice.status === 'paid') return;

  await admin.from('invoices').update({ payment_state: 'processing', paid_via: 'stripe' }).eq('id', invoiceId);

  await notifyAdminOfInvoicePayment({
    projectName: invoice.projects?.name || 'a project',
    projectId: invoice.project_id,
    clientName: 'Your client',
    amount: Number(invoice.amount),
    method: 'bank transfer (ACH)',
    outcome: 'processing',
  });
}

async function markFailed(admin, invoiceId) {
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, project_id, amount, status, projects(name)')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice || invoice.status === 'paid') return;

  await admin.from('invoices').update({ payment_state: 'failed' }).eq('id', invoiceId);

  await notifyAdminOfInvoicePayment({
    projectName: invoice.projects?.name || 'a project',
    projectId: invoice.project_id,
    clientName: 'Your client',
    amount: Number(invoice.amount),
    method: 'online payment',
    outcome: 'failed',
  });
}

export async function POST(request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const invoiceId = session.metadata?.invoice_id || session.client_reference_id;
        if (!invoiceId) break;
        const method = session.payment_method_types?.[0];
        if (session.payment_status === 'paid') {
          await markPaid(admin, invoiceId, { paymentIntentId: session.payment_intent, method });
        } else {
          // Async method (ACH) — funds not settled yet.
          await markProcessing(admin, invoiceId);
        }
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        const invoiceId = session.metadata?.invoice_id || session.client_reference_id;
        if (invoiceId) {
          await markPaid(admin, invoiceId, {
            paymentIntentId: session.payment_intent,
            method: session.payment_method_types?.[0],
          });
        }
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        const invoiceId = session.metadata?.invoice_id || session.client_reference_id;
        if (invoiceId) await markFailed(admin, invoiceId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
