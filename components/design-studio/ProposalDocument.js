import { BRAND, SCOPE_NOTE, TERMS_NOTE, C, money } from '@/lib/design-studio/brand';

/**
 * The only thing a client ever sees.
 *
 * It deliberately does NOT show: base package price, size-band multiplier,
 * complexity multiplier, trade discount, manual adjustment, estimated hours or
 * effective hourly rate. The client sees one package price, real optional
 * add-ons, and the total. Nothing here invites line-item negotiation.
 */
export default function ProposalDocument({ quote, pricing, watermark, roomScans }) {
  const p = pricing || quote?.pricing;
  if (!p) return null;

  const inc = p.included || {};
  const addOns = (p.selectedAddOns || []).filter((l) => l.qty > 0);
  const issued = quote?.created_at ? new Date(quote.created_at) : new Date();

  // One client-facing number: package, with every internal multiplier folded in.
  const packagePrice =
    (p.package?.subtotal || 0) +
    (p.rush?.amount || 0) -
    (p.tradePartner?.amount || 0) +
    (p.adjustment || 0);

  const line = { display: 'flex', justifyContent: 'space-between', gap: 20, padding: '11px 0', borderBottom: `1px solid ${C.line}`, fontSize: 15 };
  const sectionTitle = { fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, margin: '34px 0 10px' };

  return (
    <article
      style={{
        position: 'relative',
        background: C.paper,
        color: C.ink,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '38px 40px 44px',
        maxWidth: 780,
        margin: '0 auto',
        fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        lineHeight: 1.55,
      }}
    >
      {watermark ? (
        <div
          style={{
            position: 'absolute', top: 14, right: 18, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: C.clay,
          }}
        >
          {watermark}
        </div>
      ) : null}

      <header style={{ borderBottom: `2px solid ${C.ink}`, paddingBottom: 18, marginBottom: 6 }}>
        <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: '-0.01em' }}>{BRAND.name}</div>
        <div style={{ fontSize: 13.5, color: C.clay, marginTop: 3 }}>{BRAND.tagline}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
          {[BRAND.parentLine, BRAND.email, BRAND.phone].filter(Boolean).join(' · ')}
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, margin: '22px 0 6px' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>Prepared for</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 3 }}>{quote?.client_name || '—'}</div>
          {quote?.project_address ? (
            <div style={{ fontSize: 14, color: C.inkSoft }}>{quote.project_address}</div>
          ) : null}
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, color: C.inkSoft }}>
          <div>Proposal {quote?.quote_number || '—'}</div>
          <div>{issued.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          {quote?.valid_until ? (
            <div style={{ color: C.muted }}>
              Valid through {new Date(`${quote.valid_until}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          ) : null}
        </div>
      </div>

      <div style={sectionTitle}>Scope of engagement</div>
      <div style={{ background: C.sand, borderRadius: 8, padding: '18px 20px' }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          {p.labels?.projectType} — {p.labels?.serviceLevel} Package
        </div>
        <div style={{ fontSize: 14, color: C.inkSoft, marginTop: 4 }}>{inc.blurb}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>
          Approximate design area: {Number(p.inputs?.areaSqft || 0).toLocaleString()} sf
        </div>
      </div>

      {roomScans && roomScans.length > 0 ? (
        <>
          <div style={sectionTitle}>{roomScans.length > 1 ? '3D room scans' : '3D room scan'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(roomScans.length, 2)}, 1fr)`, gap: 14 }}>
            {roomScans.map((scan) => (
              <div key={scan.id} style={{ background: C.sand, borderRadius: 8, overflow: 'hidden' }}>
                {scan.floorPlanUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={scan.floorPlanUrl} alt={scan.roomLabel || 'Floor plan'} style={{ width: '100%', display: 'block' }} />
                ) : null}
                <div style={{ padding: '10px 14px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{scan.roomLabel || 'Scanned space'}</div>
                  {scan.areaSqft ? (
                    <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                      Measured {Number(scan.areaSqft).toLocaleString()} sf via LiDAR scan
                    </div>
                  ) : null}
                  {scan.modelUrl ? (
                    <a href={scan.modelUrl} rel="ar" style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, fontWeight: 600, color: C.clay, textDecoration: 'none' }}>
                      View in 3D / AR →
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div style={sectionTitle}>What is included</div>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15 }}>
        <li>Existing conditions set up as a working base plan</li>
        <li>{inc.concepts} proposed layout concept{inc.concepts === '1' ? '' : 's'}</li>
        <li>Finalised dimensioned 2D floor plan</li>
        <li>Furniture and fixture layout — {String(inc.styling || '').toLowerCase()}</li>
        {inc.model3d ? <li>Complete 3D model of the design</li> : null}
        {inc.renderedViews > 0 ? (
          <li>{inc.renderedViews} rendered presentation view{inc.renderedViews === 1 ? '' : 's'}</li>
        ) : null}
        {inc.finishDirection && inc.finishDirection !== 'Not included' ? (
          <li>Material and finish direction — {String(inc.finishDirection).toLowerCase()}</li>
        ) : null}
        <li>{inc.revisions} revision round{inc.revisions === 1 ? '' : 's'}</li>
        <li>Presentation-ready PDF package</li>
      </ul>

      <div style={sectionTitle}>Investment</div>
      <div style={line}>
        <span>{p.labels?.projectType} — {p.labels?.serviceLevel} Package</span>
        <strong>{money(packagePrice)}</strong>
      </div>
      {addOns.map((l) => (
        <div key={l.key} style={line}>
          <span>
            {l.label}
            {l.qty > 1 ? ` (${l.qty} ${l.unit}s)` : ''}
          </span>
          <strong>{money(l.amount)}</strong>
        </div>
      ))}
      <div style={{ ...line, borderBottom: 'none', borderTop: `2px solid ${C.ink}`, marginTop: 8, paddingTop: 14, fontSize: 19 }}>
        <strong>Total</strong>
        <strong>{money(p.total)}</strong>
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', background: C.sand, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>
            Deposit to begin ({Math.round((p.depositPct || 0.5) * 100)}%)
          </div>
          <div style={{ fontSize: 21, fontWeight: 600, marginTop: 4 }}>{money(p.deposit)}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: C.sand, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>
            Balance on delivery
          </div>
          <div style={{ fontSize: 21, fontWeight: 600, marginTop: 4 }}>{money(p.balance)}</div>
        </div>
      </div>

      <div style={sectionTitle}>Available if needed</div>
      <div style={{ fontSize: 14.5 }}>
        {(p.addOnLines || [])
          .filter((l) => l.qty === 0)
          .map((l) => (
            <div key={l.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', color: C.inkSoft }}>
              <span>{l.label}</span>
              <span>{money(l.rate)} / {l.unit}</span>
            </div>
          ))}
      </div>

      <div style={sectionTitle}>Scope note</div>
      <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.65, margin: 0 }}>{SCOPE_NOTE}</p>

      <div style={sectionTitle}>Terms</div>
      <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.65, margin: 0 }}>{TERMS_NOTE}</p>

      <footer style={{ marginTop: 34, paddingTop: 16, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.muted, textAlign: 'center' }}>
        {[BRAND.name, BRAND.parentLine, BRAND.website].filter(Boolean).join(' · ')}
      </footer>
    </article>
  );
}
