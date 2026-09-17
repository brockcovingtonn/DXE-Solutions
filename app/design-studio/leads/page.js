import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffUser, supabaseAdmin } from '@/lib/design-studio/server';
import { BRAND, C, S } from '@/lib/design-studio/brand';
import PendingLeadRow from '@/components/design-studio/PendingLeadRow';

export const dynamic = 'force-dynamic';

// Leads that were sent an intake form (via the public Book-a-call form or
// staff's "Send Intake Form" button) but haven't filled it out yet — see
// supabase/design_studio_leads_migration.sql. They disappear from here the
// moment they convert into a quote.
export default async function PendingLeadsPage() {
  const user = await getStaffUser();
  if (!user) redirect('/login');

  const db = supabaseAdmin();
  const { data: leads } = await db.from('design_studio_leads').select('*').order('created_at', { ascending: false });
  const rows = leads || [];

  return (
    <div style={S.shell}>
      <Link href="/design-studio" className="ds-link" style={{ ...S.small, color: C.clay, textDecoration: 'none' }}>
        ← {BRAND.shortName} quotes
      </Link>
      <h1 style={{ ...S.h1, margin: '10px 0 22px' }}>Pending Leads</h1>

      <section style={S.card}>
        {rows.length === 0 ? (
          <div style={{ ...S.small, padding: '18px 0' }}>
            No pending leads — everyone sent an intake form has either completed it or hasn't been sent one yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.muted, fontSize: 11.5, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 10px 8px 0' }}>Name</th>
                  <th style={{ padding: '8px 10px' }}>Contact</th>
                  <th style={{ padding: '8px 10px' }}>Address</th>
                  <th style={{ padding: '8px 10px' }}>Sent</th>
                  <th style={{ padding: '8px 0 8px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <PendingLeadRow key={lead.id} lead={lead} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
