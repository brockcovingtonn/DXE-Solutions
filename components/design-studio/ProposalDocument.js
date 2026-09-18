import Script from 'next/script';
import RoomScanCard from './RoomScanCard';
import { BRAND, DESIGN_STUDIO_CONTACT, SCOPE_NOTE, TERMS_NOTE, C, money } from '@/lib/design-studio/brand';
import { buildIncludedBullets } from '@/lib/design-studio/pricing';

/**
 * The only thing a client ever sees.
 *
 * It deliberately does NOT show: base package price, size-band multiplier,
 * complexity multiplier, trade discount, manual adjustment, estimated hours or
 * effective hourly rate. The client sees one package price, real optional
 * add-ons, and the total. Nothing here invites line-item negotiation.
 */
export default function ProposalDocument({ quote, pricing, watermark, roomScans, floorPlans }) {
  const p = pricing || quote?.pricing;
  if (!p) return null;

  const inc = p.included || {};
  const bullets =
    Array.isArray(quote?.included_override) && quote.included_override.length
      ? quote.included_override
      : buildIncludedBullets(inc);
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
    <>
    {/* <model-viewer> — renders the room scans' glTF export in-browser (any
        browser); ios-src on each element separately hands off to native AR
        Quick Look on iOS Safari using the full-fidelity USDZ instead. */}
    <Script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js" strategy="afterInteractive" />
    {/* "Download PDF" prints just this element — everything else on the
        page (dashboard chrome, expired banner, the button itself) is
        hidden via visibility so the browser's print-to-PDF output is a
        clean copy of the proposal alone. */}
    <style>{`
      @media print {
        body * { visibility: hidden; }
        #ds-proposal-document, #ds-proposal-document * { visibility: visible; }
        #ds-proposal-document {
          position: absolute !important;
          top: 0; left: 0;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          border: none !important;
          box-shadow: none !important;
        }
        .ds-no-print { display: none !important; }
      }
    `}</style>
    <article
      id="ds-proposal-document"
      style={{
        position: 'relative',
        background: C.paper,
        color: C.ink,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        maxWidth: 780,
        margin: '0 auto',
        fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        lineHeight: 1.55,
        overflow: 'hidden',
      }}
    >
      {/* Same letterhead treatment as the other print documents (e.g. the
          project Cover Sheet): navy header with the cream logo, a gold
          accent bar, and a faint full-bleed watermark behind everything. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: '50%', left: '50%', width: 460, height: 460,
          transform: 'translate(-50%, -50%) rotate(-18deg)', opacity: 0.04, zIndex: 0, pointerEvents: 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-black.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      {watermark ? (
        <div
          style={{
            position: 'absolute', top: 14, right: 18, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: C.clay, zIndex: 2,
          }}
        >
          {watermark}
        </div>
      ) : null}

      <header
        style={{
          position: 'relative', zIndex: 1, background: C.inkSoft, padding: '20px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-cream.png" alt="DXE Solutions" style={{ height: 32 }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 300 }}>|</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/higher-thinking-logo.png" alt="Higher Thinking Consulting" style={{ height: 78 }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 17, fontWeight: 600, color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Design Proposal
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
            Generated {issued.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </header>
      <div style={{ position: 'relative', zIndex: 1, height: 4, background: C.clay }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '28px 40px 44px' }}>
        <div style={{ fontSize: 13.5, color: C.clay, fontWeight: 600 }}>{BRAND.tagline}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          {[BRAND.parentLine, DESIGN_STUDIO_CONTACT.email, DESIGN_STUDIO_CONTACT.phone].filter(Boolean).join(' · ')}
        </div>

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
              <RoomScanCard key={scan.id} scan={scan} />
            ))}
          </div>
        </>
      ) : null}

      {floorPlans && floorPlans.length > 0 ? (
        <>
          <div style={sectionTitle}>{floorPlans.length > 1 ? 'Floor plans' : 'Floor plan'}</div>
          {floorPlans.map((plan) =>
            plan.file_url ? (
              <div key={plan.id} style={{ background: C.sand, borderRadius: 8, padding: '14px 16px', marginBottom: 10 }}>
                {plan.file_type === 'pdf' ? (
                  <iframe src={plan.file_url} title={plan.file_name} style={{ width: '100%', height: 420, border: 'none', borderRadius: 6, background: C.paper }} />
                ) : plan.file_type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={plan.file_url} alt={plan.file_name} style={{ width: '100%', borderRadius: 6, display: 'block' }} />
                ) : (
                  <a href={plan.file_url} style={{ fontSize: 13.5, fontWeight: 600, color: C.clay, textDecoration: 'none' }}>
                    Download {plan.file_name} →
                  </a>
                )}
              </div>
            ) : null
          )}
        </>
      ) : null}

      <div style={sectionTitle}>What is included</div>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15 }}>
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
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

      {!quote?.hide_addon_menu ? (
        <>
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
        </>
      ) : null}

      <div style={sectionTitle}>Scope note</div>
      <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.65, margin: 0 }}>{SCOPE_NOTE}</p>

      <div style={sectionTitle}>Terms</div>
      <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.65, margin: 0 }}>{TERMS_NOTE}</p>

      <footer style={{ marginTop: 34, paddingTop: 16, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.muted, textAlign: 'center' }}>
        {[BRAND.name, BRAND.parentLine, BRAND.website].filter(Boolean).join(' · ')}
      </footer>
      </div>
    </article>
    </>
  );
}
