import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffUser, loadActiveConfig } from '@/lib/design-studio/server';
import RateCardEditor from '@/components/design-studio/RateCardEditor';
import { BRAND, C, S } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

export default async function RateCardPage() {
  const user = await getStaffUser();
  if (!user) redirect('/login');
  if (!user.isMaster) redirect('/design-studio');

  const config = await loadActiveConfig();

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <Link href="/design-studio" style={{ ...S.small, color: C.clay, textDecoration: 'none' }}>
          ← {BRAND.shortName} quotes
        </Link>
        <h1 style={{ ...S.h1, margin: '10px 0 6px' }}>Rate card</h1>
        <div style={{ ...S.small, marginBottom: 20, maxWidth: 640 }}>
          Master admin only. Saving creates a new version rather than overwriting, so quotes already
          issued keep the rates they were priced on. Currently on v{config.version}.
        </div>
        <RateCardEditor initialConfig={config} />
      </div>
    </div>
  );
}
