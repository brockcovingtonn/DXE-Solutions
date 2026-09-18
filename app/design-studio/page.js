import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffUser, supabaseAdmin } from '@/lib/design-studio/server';
import { BRAND, C, S, money } from '@/lib/design-studio/brand';
import SendIntakeFormButton from '@/components/design-studio/SendIntakeFormButton';
import QuotesTable from '@/components/design-studio/QuotesTable';

export const dynamic = 'force-dynamic';

export default async function DesignStudioDashboard() {
  const user = await getStaffUser();
  if (!user) redirect('/login');

  const db = supabaseAdmin();
  let query = db
    .from('design_studio_quotes')
    .select('id, quote_number, status, source, client_name, project_address, project_type, service_level, area_sqft, total, created_at, created_by, created_by_name, valid_until')
    .order('created_at', { ascending: false })
    .limit(100);
  if (!user.isMaster) query = query.eq('created_by', user.id);
  const { data: quotes } = await query;
  const rows = quotes || [];

  let staffOptions = [];
  if (user.isMaster) {
    const { data: staff } = await db
      .from('profiles')
      .select('id, first_name, last_name, email')
      .or('is_admin.eq.true,is_employee.eq.true')
      .order('first_name');
    staffOptions = (staff || []).map((s) => ({
      id: s.id,
      name: [s.first_name, s.last_name].filter(Boolean).join(' ').trim() || s.email || 'Unnamed',
    }));
  }

  const { count: pendingLeadCount } = await db
    .from('design_studio_leads')
    .select('id', { count: 'exact', head: true });

  const open = rows.filter((q) => q.status === 'draft' || q.status === 'sent');
  const won = rows.filter((q) => q.status === 'accepted');
  const wonValue = won.reduce((s, q) => s + Number(q.total || 0), 0);
  const openValue = open.reduce((s, q) => s + Number(q.total || 0), 0);
  const decided = rows.filter((q) => q.status === 'accepted' || q.status === 'declined').length;
  const winRate = decided ? Math.round((won.length / decided) * 100) : null;

  return (
      <div style={S.shell}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
          <div>
            <h1 style={S.h1}>DXE Solutions × Higher Thinking Consulting</h1>
            <div style={{ fontSize: 14, color: C.clay, marginTop: 3 }}>{BRAND.tagline}</div>
            <div style={{ ...S.small, marginTop: 5 }}>
              {[BRAND.parentLine, `signed in as ${user.name} (${user.role.replace('_', ' ')})`].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {user.isMaster ? (
              <Link href="/design-studio/rates" style={{ ...S.btnGhost, textDecoration: 'none' }}>Rate card</Link>
            ) : null}
            <SendIntakeFormButton />
            <Link href="/design-studio/leads" style={{ ...S.btnGhost, textDecoration: 'none' }}>
              Pending leads{pendingLeadCount ? ` (${pendingLeadCount})` : ''}
            </Link>
            <Link href="/design-studio/new" style={{ ...S.btn, textDecoration: 'none' }}>New quote</Link>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
          <Stat label="Open quotes" value={String(open.length)} sub={money(openValue)} />
          <Stat label="Accepted" value={String(won.length)} sub={money(wonValue)} />
          <Stat label="Win rate" value={winRate === null ? '—' : `${winRate}%`} sub={decided ? `${decided} decided` : 'No decisions yet'} />
          <Stat label="Average accepted" value={won.length ? money(wonValue / won.length) : '—'} sub="Per project" />
        </div>

        <section style={S.card}>
          <h2 style={S.h2}>{user.isMaster ? 'All quotes' : 'My quotes'}</h2>
          {rows.length === 0 ? (
            <div style={{ ...S.small, padding: '18px 0' }}>
              No quotes yet. Start with <Link href="/design-studio/new" className="ds-link" style={{ color: C.clay }}>a new quote</Link>.
            </div>
          ) : (
            <QuotesTable initialRows={rows} isMaster={user.isMaster} staffOptions={staffOptions} />
          )}
        </section>
      </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 10, padding: '15px 17px' }}>
      <div style={{ fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>{label}</div>
      <div style={{ fontSize: 25, fontWeight: 600, marginTop: 5 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{sub}</div>
    </div>
  );
}
