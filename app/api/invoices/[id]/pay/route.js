import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getStripe } from '@/lib/stripe';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dxesolutions.com';

// Client-initiated: creates a Stripe Checkout Session for one invoice
// and returns its URL for the browser to redirect to. The invoice is
// marked paid later by the Stripe webhook, not here.
export async function POST(request, { params }) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Online payment isn’t set up yet.' }, { status: 503 });
  }

  // RLS ensures the caller can only read an invoice that's shared with
  // them on a project they own.
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, project_id, kind, description, amount, status, payment_state')
    .eq('id', params.id)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }
  if (invoice.kind !== 'invoice') {
    return NextResponse.json({ error: 'This entry isn’t a payable invoice.' }, { status: 400 });
  }
  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'This invoice is already paid.' }, { status: 409 });
  }
  if (invoice.payment_state === 'processing') {
    return NextResponse.json({ error: 'A payment for this invoice is already processing.' }, { status: 409 });
  }

  const amountCents = Math.round(Number(invoice.amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    return NextResponse.json({ error: 'Invoice amount is too small to charge.' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();

  const accountingUrl = `${SITE_URL}/portal/projects/${invoice.project_id}/accounting`;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // No payment_method_types — Stripe offers every method enabled in
      // the Dashboard (card + Apple/Google Pay by default; ACH, Cash App
      // Pay, Link once you toggle them on).
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: invoice.description || 'DXE Solutions invoice',
            },
          },
        },
      ],
      customer_email: profile?.email || undefined,
      client_reference_id: invoice.id,
      metadata: { invoice_id: invoice.id, project_id: invoice.project_id },
      payment_intent_data: { metadata: { invoice_id: invoice.id, project_id: invoice.project_id } },
      success_url: `${accountingUrl}?payment=success`,
      cancel_url: `${accountingUrl}?payment=canceled`,
    });
  } catch (err) {
    console.error('Stripe checkout session error:', err);
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 502 });
  }

  // Record the session id with the service-role client (clients can't
  // UPDATE invoices under RLS).
  await createAdminClient()
    .from('invoices')
    .update({ stripe_session_id: session.id })
    .eq('id', invoice.id);

  return NextResponse.json({ url: session.url });
}
