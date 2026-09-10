import Stripe from 'stripe';

// Server-side Stripe client. Returns null when STRIPE_SECRET_KEY isn't
// set, so the online-payment feature simply stays hidden until you drop
// in your keys — invoices keep working without it.

let _stripe = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) {
    _stripe = new Stripe(key, {
      // Pin nothing — use the SDK's built-in API version so an upgrade is
      // a single dependency bump.
      appInfo: { name: 'DXE Solutions', url: 'https://www.dxesolutions.com' },
      typescript: false,
    });
  }
  return _stripe;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Preview mode: renders the "Pay now" UI even without Stripe keys, so
// the layout can be reviewed. The button explains payments aren't live
// yet instead of charging anything. Ignored once STRIPE_SECRET_KEY is
// set (real payments take over).
export function paymentsPreviewEnabled() {
  return process.env.NEXT_PUBLIC_PAYMENTS_PREVIEW === '1';
}

const METHOD_LABELS = {
  card: 'card',
  us_bank_account: 'bank transfer (ACH)',
  cashapp: 'Cash App Pay',
  link: 'Link',
  affirm: 'Affirm',
  klarna: 'Klarna',
  amazon_pay: 'Amazon Pay',
};

export function paymentMethodLabel(method) {
  if (!method) return 'online payment';
  return METHOD_LABELS[method] || method.replace(/_/g, ' ');
}
