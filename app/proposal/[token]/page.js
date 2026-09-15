import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/design-studio/server';
import ProposalDocument from '@/components/design-studio/ProposalDocument';
import { BRAND, C } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { token } = await params;
  const db = supabaseAdmin();
  const { data } = await db
    .from('design_studio_quotes')
    .select('quote_number, client_name')
    .eq('share_token', token)
    .maybeSingle();
  return {
    title: data ? `${BRAND.name} — Proposal ${data.quote_number}` : BRAND.name,
    robots: { index: false, follow: false },
  };
}

/**
 * Unauthenticated, reachable only with the token. No internal figures are sent
 * to the browser: only the columns below are selected, and the internal block
 * is stripped from the pricing snapshot before render.
 */
export default async function PublicProposalPage({ params }) {
  const { token } = await params;
  const db = supabaseAdmin();

  const { data: quote } = await db
    .from('design_studio_quotes')
    .select('quote_number, status, client_name, project_address, pricing, valid_until, created_at')
    .eq('share_token', token)
    .maybeSingle();

  if (!quote) notFound();

  const { internal, inputs, ...safePricing } = quote.pricing || {};
  const pricing = {
    ...safePricing,
    inputs: {
      areaSqft: inputs?.areaSqft ?? 0,
      projectType: inputs?.projectType,
      serviceLevel: inputs?.serviceLevel,
    },
  };

  const expired =
    quote.status === 'expired' ||
    (quote.valid_until && new Date(`${quote.valid_until}T23:59:59`) < new Date());

  return (
    <div style={{ background: C.sand, minHeight: '100vh', padding: '36px 18px 70px' }}>
      {expired ? (
        <div
          style={{
            maxWidth: 780, margin: '0 auto 16px', background: '#F5EAE4', color: C.warn,
            border: `1px solid #E8D5C9`, borderRadius: 8, padding: '12px 16px', fontSize: 13.5,
            fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          This proposal has passed its validity date. Please contact {BRAND.name} for current pricing.
        </div>
      ) : null}

      <ProposalDocument quote={quote} pricing={pricing} />

      <div
        style={{
          maxWidth: 780, margin: '20px auto 0', textAlign: 'center', fontSize: 13, color: C.muted,
          fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        Questions about this proposal? Contact {BRAND.email || BRAND.website}.
      </div>
    </div>
  );
}
