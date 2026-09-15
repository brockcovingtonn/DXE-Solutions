import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffUser, loadActiveConfig } from '@/lib/design-studio/server';
import QuoteBuilder from '@/components/design-studio/QuoteBuilder';
import { BRAND, C, S } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

export default async function NewQuotePage() {
  const user = await getStaffUser();
  if (!user) redirect('/login');
  const config = await loadActiveConfig();

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <Link href="/design-studio" style={{ ...S.small, color: C.clay, textDecoration: 'none' }}>
          ← {BRAND.shortName} quotes
        </Link>
        <h1 style={{ ...S.h1, margin: '10px 0 22px' }}>New quote</h1>
        <QuoteBuilder config={config} viewer={user} />
      </div>
    </div>
  );
}
