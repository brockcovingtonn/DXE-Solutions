import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getStaffUser, supabaseAdmin } from '@/lib/design-studio/server';
import ProposalDocument from '@/components/design-studio/ProposalDocument';
import QuoteActions from '@/components/design-studio/QuoteActions';
import { BRAND, C, S, money } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

export default async function QuoteDetailPage({ params }) {
  const user = await getStaffUser();
  if (!user) redirect('/login');
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: quote } = await db.from('design_studio_quotes').select('*').eq('id', id).maybeSingle();
  if (!quote) notFound();
  if (!user.isMaster && quote.created_by !== user.id) redirect('/design-studio');

  const { data: scanRows } = await db
    .from('design_studio_room_scans')
    .select('*')
    .eq('quote_id', id)
    .order('created_at', { ascending: false });

  const roomScans = await Promise.all(
    (scanRows || []).map(async (scan) => {
      const [{ data: model }, { data: floorPlan }] = await Promise.all([
        db.storage.from('design-studio-scans').createSignedUrl(scan.model_path, 3600),
        scan.floor_plan_path
          ? db.storage.from('design-studio-scans').createSignedUrl(scan.floor_plan_path, 3600)
          : Promise.resolve({ data: null }),
      ]);
      return {
        id: scan.id,
        roomLabel: scan.room_label,
        areaSqft: scan.area_sqft,
        areaIsEstimate: scan.area_is_estimate,
        wallCount: scan.wall_count,
        doorCount: scan.door_count,
        windowCount: scan.window_count,
        modelUrl: model?.signedUrl || null,
        floorPlanUrl: floorPlan?.signedUrl || null,
      };
    })
  );

  const p = quote.pricing || {};
  const internal = p.internal || {};

  return (
      <div style={S.shell}>
        <Link href="/design-studio" style={{ ...S.small, color: C.clay, textDecoration: 'none' }}>
          ← {BRAND.shortName} quotes
        </Link>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, margin: '10px 0 22px' }}>
          <div>
            <h1 style={S.h1}>{quote.quote_number}</h1>
            <div style={{ ...S.small, marginTop: 4 }}>
              {quote.client_name || 'Unnamed client'}
              {quote.project_address ? ` · ${quote.project_address}` : ''} · prepared by {quote.created_by_name || '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 600 }}>{money(quote.total)}</div>
            <div style={S.small}>Deposit {money(quote.deposit)}</div>
          </div>
        </header>

        <QuoteActions quote={quote} canReprice={quote.status === 'draft'} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 22, alignItems: 'start', marginTop: 18 }}>
          <div>
            <ProposalDocument quote={quote} pricing={p} roomScans={roomScans} />
          </div>

          <aside>
            {roomScans.length > 0 ? (
              <section style={S.card}>
                <h2 style={S.h2}>Room scans</h2>
                {roomScans.map((scan) => (
                  <div key={scan.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{scan.roomLabel || 'Scanned space'}</div>
                    <Row
                      label="Area"
                      value={scan.areaSqft ? `${Number(scan.areaSqft).toLocaleString()} sf${scan.areaIsEstimate ? ' (approx.)' : ''}` : '—'}
                    />
                    <Row label="Walls / doors / windows" value={`${scan.wallCount} / ${scan.doorCount} / ${scan.windowCount}`} />
                    {scan.modelUrl ? (
                      <a href={scan.modelUrl} rel="ar" style={{ ...S.small, color: C.clay, fontWeight: 600, textDecoration: 'none' }}>
                        View 3D model →
                      </a>
                    ) : null}
                  </div>
                ))}
              </section>
            ) : null}

            <section style={S.card}>
              <h2 style={S.h2}>Internal breakdown</h2>
              <Row label="Package base" value={money(p.package?.base)} />
              <Row label={`Size — ${p.labels?.sizeBand || '—'}`} value={p.package?.sizeBand?.amount ? `+${money(p.package.sizeBand.amount)}` : '—'} />
              <Row label={`Complexity — ${p.labels?.complexity || '—'}`} value={p.package?.complexity?.amount ? `+${money(p.package.complexity.amount)}` : '—'} />
              {p.rush?.applied ? <Row label="Rush" value={`+${money(p.rush.amount)}`} /> : null}
              {p.addOnTotal ? <Row label="Add-ons" value={`+${money(p.addOnTotal)}`} /> : null}
              {p.tradePartner?.applied ? <Row label="Trade partner" value={`−${money(p.tradePartner.amount)}`} accent={C.warn} /> : null}
              {p.adjustment ? <Row label="Adjustment" value={money(p.adjustment)} accent={C.warn} /> : null}
              {p.minimum?.applied ? <Row label="Minimum applied" value={money(p.minimum.fee)} accent={C.warn} /> : null}
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 8, paddingTop: 10 }}>
                <Row label="Est. hours" value={`${internal.estHours ?? '—'} hrs`} />
                <Row
                  label="Implied rate"
                  value={internal.impliedHourly ? `$${internal.impliedHourly}/hr` : '—'}
                  accent={internal.belowTarget ? C.warn : C.good}
                />
                <Row label="Effective" value={internal.effectivePerSqft ? `$${internal.effectivePerSqft}/sf` : '—'} />
              </div>
              <div style={{ ...S.small, marginTop: 10 }}>
                Priced on rate card v{internal.configVersion ?? quote.config_snapshot?.version ?? '—'}
                {p.adjustmentNote ? ` · ${p.adjustmentNote}` : ''}
              </div>
            </section>

            {quote.internal_notes ? (
              <section style={S.card}>
                <h2 style={S.h2}>Internal notes</h2>
                <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: C.inkSoft }}>{quote.internal_notes}</div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', fontSize: 14 }}>
      <span style={{ color: C.inkSoft }}>{label}</span>
      <span style={{ fontWeight: 600, color: accent || C.ink }}>{value}</span>
    </div>
  );
}
