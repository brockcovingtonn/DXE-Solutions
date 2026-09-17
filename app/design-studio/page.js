import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffUser, supabaseAdmin } from '@/lib/design-studio/server';
import { BRAND, C, S, money } from '@/lib/design-studio/brand';
import SendIntakeFormButton from '@/components/design-studio/SendIntakeFormButton';

export const dynamic = 'force-dynamic';

const STATUS_STYLE = {
  draft: { bg: '#EFEFEC', fg: C.inkSoft },
  sent: { bg: '#E9EFF3', fg: '#3E5468' },
  accepted: { bg: '#E7F0EA', fg: C.good },
  declined: { bg: '#F5EAE4', fg: C.warn },
  expired: { bg: '#F0EFED', fg: C.muted },
};

export default async function DesignStudioDashboard() {
  const user = await getStaffUser();
  if (!user) redirect('/login');

  const db = supabaseAdmin();
  let query = db
    .from('design_studio_quotes')
    .select('id, quote_number, status, source, client_name, project_address, project_type, service_level, area_sqft, total, created_at, created_by_name, valid_until')
    .order('created_at', { ascending: false })
    .limit(100);
  if (!user.isMaster) query = query.eq('created_by', user.id);
  const { data: quotes } = await query;
  const rows = quotes || [];

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
            <h1 style={S.h1}>{BRAND.name}</h1>
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
            <Link href="/design-studio/leads" className="ds-link" style={{ ...S.small, textDecoration: 'none', color: C.muted }}>
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: C.muted, fontSize: 11.5, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px 8px 0' }}>Quote</th>
                    <th style={{ padding: '8px 10px' }}>Client</th>
                    <th style={{ padding: '8px 10px' }}>Project</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                    {user.isMaster ? <th style={{ padding: '8px 10px' }}>By</th> : null}
                    <th style={{ padding: '8px 0 8px 10px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((q) => {
                    const st = STATUS_STYLE[q.status] || STATUS_STYLE.draft;
                    return (
                      <tr key={q.id} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td style={{ padding: '11px 10px 11px 0', whiteSpace: 'nowrap' }}>
                          <Link href={`/design-studio/${q.id}`} className="ds-link" style={{ color: C.ink, fontWeight: 600, textDecoration: 'none' }}>
                            {q.quote_number}
                          </Link>
                          <div style={{ fontSize: 12, color: C.muted }}>
                            {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td style={{ padding: '11px 10px' }}>
                          {q.client_name || '—'}
                          {q.source === 'web_lead' ? (
                            <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.clayDark, background: 'rgba(201,168,87,0.16)', padding: '2px 6px', borderRadius: 4 }}>
                              Submitted form
                            </span>
                          ) : null}
                          <div style={{ fontSize: 12, color: C.muted }}>{q.project_address || ''}</div>
                        </td>
                        <td style={{ padding: '11px 10px' }}>
                          {q.project_type}
                          <div style={{ fontSize: 12, color: C.muted }}>
                            {q.service_level} · {Number(q.area_sqft || 0).toLocaleString()} sf
                          </div>
                        </td>
                        <td style={{ padding: '11px 10px' }}>
                          <span style={{ background: st.bg, color: st.fg, padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                            {q.status}
                          </span>
                        </td>
                        {user.isMaster ? (
                          <td style={{ padding: '11px 10px', color: C.muted, fontSize: 13 }}>{q.created_by_name || '—'}</td>
                        ) : null}
                        <td style={{ padding: '11px 0 11px 10px', textAlign: 'right', fontWeight: 600 }}>{money(q.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
