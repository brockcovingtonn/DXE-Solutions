import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/design-studio/server';
import PublicIntakeForm from '@/components/design-studio/PublicIntakeForm';
import { BRAND, C } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { token } = await params;
  const db = supabaseAdmin();
  const { data } = await db
    .from('design_studio_leads')
    .select('full_name')
    .eq('token', token)
    .maybeSingle();
  return {
    title: data ? `${BRAND.name} — Intake` : BRAND.name,
    robots: { index: false, follow: false },
  };
}

// Unauthenticated, reachable only with a lead's token — same pattern as
// app/proposal/[token]/page.js.
export default async function PublicIntakePage({ params }) {
  const { token } = await params;
  const db = supabaseAdmin();
  const { data: lead } = await db
    .from('design_studio_leads')
    .select('id')
    .eq('token', token)
    .maybeSingle();
  if (!lead) notFound();

  return (
    <div style={{ background: C.sand, minHeight: '100vh', padding: '36px 18px 70px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <PublicIntakeForm token={token} />
      </div>
    </div>
  );
}
