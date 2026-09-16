import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/design-studio/server';
import PublicIntakeForm from '@/components/design-studio/PublicIntakeForm';
import { BRAND, C } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { token } = await params;
  const db = supabaseAdmin();
  const { data } = await db
    .from('design_studio_quotes')
    .select('quote_number')
    .eq('share_token', token)
    .maybeSingle();
  return {
    title: data ? `${BRAND.name} — Intake ${data.quote_number}` : BRAND.name,
    robots: { index: false, follow: false },
  };
}

// Unauthenticated, reachable only with the token — same pattern as
// app/proposal/[token]/page.js.
export default async function PublicIntakePage({ params }) {
  const { token } = await params;
  const db = supabaseAdmin();
  const { data: quote } = await db
    .from('design_studio_quotes')
    .select('id')
    .eq('share_token', token)
    .maybeSingle();
  if (!quote) notFound();

  return (
    <div style={{ background: C.sand, minHeight: '100vh', padding: '36px 18px 70px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <PublicIntakeForm token={token} />
      </div>
    </div>
  );
}
