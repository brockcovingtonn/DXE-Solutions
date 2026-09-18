function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || 'there';
}

const sectionTitle = { fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '34px 0 10px' };

// Read-only rendering of a proposal — a cover letter followed by the
// formal proposal (project info, scope of services, compensation
// breakdown, payment terms, limitations, signature block). Shared by
// the finalize preview modal, the admin "view" page, and the client
// portal — restyling this once keeps all three cohesive. Visual
// language deliberately mirrors components/design-studio/ProposalDocument.js
// (same letterhead, watermark, section treatment) minus the Higher
// Thinking Consulting co-brand — this is a DXE Solutions-only document.
export default function ProposalDocument({ proposal, lineItems, watermark, signatureUrl }) {
  const signature = Array.isArray(proposal.proposal_signatures) ? proposal.proposal_signatures[0] : proposal.proposal_signatures;
  const decline = Array.isArray(proposal.proposal_declines) ? proposal.proposal_declines[0] : proposal.proposal_declines;
  const issued = proposal.created_at ? new Date(proposal.created_at) : new Date();

  return (
    <article
      style={{
        position: 'relative',
        background: 'var(--white)',
        color: '#1a2530',
        border: '1px solid var(--border)',
        borderRadius: 10,
        maxWidth: 780,
        margin: '0 auto',
        fontFamily: 'Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        lineHeight: 1.55,
        overflow: 'hidden',
      }}
    >
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
            letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', zIndex: 2,
          }}
        >
          {watermark}
        </div>
      ) : null}

      <header
        style={{
          position: 'relative', zIndex: 1, background: 'var(--navy)', padding: '20px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-cream.png" alt="DXE Solutions" style={{ height: 32 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 17, fontWeight: 600, color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Proposal
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
            Generated {formatDate(issued)}
          </div>
        </div>
      </header>
      <div style={{ position: 'relative', zIndex: 1, height: 4, background: 'var(--gold)' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '28px 40px 44px' }}>
        <div style={{ fontSize: 13.5, color: 'var(--gold)', fontWeight: 600 }}>Permitting &amp; Project Management</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
          dixie@dxesolutions.com · 323-364-0810
        </div>

        <p style={{ fontSize: 14, marginTop: 22, marginBottom: '0.85rem' }}>Dear {firstName(proposal.client_name)},</p>

        {proposal.intro_paragraph ? (
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: '#2d3748', marginBottom: '0.85rem', whiteSpace: 'pre-line' }}>{proposal.intro_paragraph}</p>
        ) : null}

        <p style={{ fontSize: 13.5, marginBottom: '1.25rem' }}>We look forward to the opportunity to support your project.</p>
        <p style={{ fontSize: 13.5, marginBottom: 0 }}>Sincerely,</p>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)', marginBottom: 0 }}>{proposal.prepared_by || 'DXE Solutions'}</p>

        <div style={sectionTitle}>{proposal.title || 'Scope of work'}</div>
        <div style={{ background: 'var(--cream)', borderRadius: 8, padding: '18px 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{proposal.title || 'Scope of Work'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>
            Project Address: {proposal.project_address || '—'} &nbsp;·&nbsp; Client: {proposal.client_name || '—'}
          </div>
        </div>

        {proposal.scope_summary ? (
          <>
            <div style={sectionTitle}>Project Description</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: '#2d3748', whiteSpace: 'pre-line', margin: 0 }}>{proposal.scope_summary}</p>
          </>
        ) : null}

        {lineItems && lineItems.length > 0 ? (
          <>
            <div style={sectionTitle}>Scope of Services</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14.5 }}>
              {lineItems.map((item) => (
                <li key={item.id || `${item.category}-${item.description}`}>
                  {item.category ? <strong>{item.category}</strong> : null}
                  {item.category && item.description ? ' — ' : ''}
                  {item.description}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <div style={sectionTitle}>Compensation Breakdown</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: 'var(--cream)' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, letterSpacing: '0.05em', color: 'var(--navy)' }}>DESCRIPTION</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, letterSpacing: '0.05em', color: 'var(--navy)' }}>QTY</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, letterSpacing: '0.05em', color: 'var(--navy)' }}>UNIT</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, letterSpacing: '0.05em', color: 'var(--navy)' }}>UNIT PRICE</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, letterSpacing: '0.05em', color: 'var(--navy)' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(lineItems || []).map((item) => (
              <tr key={item.id || `${item.category}-${item.description}`} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px' }}>
                  {item.category ? <strong>{item.category}</strong> : null}
                  {item.category && item.description ? ' — ' : ''}
                  {item.description}
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ padding: '10px' }}>{item.unit}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <div style={{ width: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(proposal.subtotal)}</span>
            </div>
            {Number(proposal.adjustment) !== 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0' }}>
                <span>{proposal.adjustment_label || 'Adjustment'}</span>
                <span>{formatCurrency(proposal.adjustment)}</span>
              </div>
            ) : null}
            <div style={{ borderTop: '2px solid var(--navy)', marginTop: 6, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>
              <span>Total</span>
              <span>{formatCurrency(proposal.total)}</span>
            </div>
          </div>
        </div>

        {proposal.payment_terms ? (
          <>
            <div style={sectionTitle}>Payment Terms</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#2d3748', whiteSpace: 'pre-line', margin: 0 }}>{proposal.payment_terms}</p>
          </>
        ) : null}

        {proposal.valid_until ? (
          <p style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: 10 }}>
            This proposal is valid until {formatDate(proposal.valid_until)}.
          </p>
        ) : null}

        {proposal.limitations ? (
          <>
            <div style={sectionTitle}>Limitations of Responsibility</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-line', margin: 0 }}>{proposal.limitations}</p>
          </>
        ) : null}

        <div style={sectionTitle}>Authorization</div>
        {signature ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureUrl} alt={`Signature of ${signature.signer_name || 'client'}`} style={{ height: 50 }} />
            ) : null}
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Signed by {signature.signer_name}
              <br />
              {formatDate(signature.created_at)}
            </div>
          </div>
        ) : decline ? (
          <div style={{ fontSize: 13, color: 'var(--warn, #A8562F)' }}>
            Declined by {firstName(proposal.client_name)} on {formatDate(decline.created_at)}
            {decline.reason ? <><br />Reason: {decline.reason}</> : null}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 40, marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderTop: '1px solid var(--text-tertiary)', paddingTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>Client Signature</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ borderTop: '1px solid var(--text-tertiary)', paddingTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>Date</div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 20, width: 220 }}>
          <div style={{ borderTop: '1px solid var(--text-tertiary)', paddingTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            {proposal.prepared_by || 'DXE Solutions'}, DXE Solutions
          </div>
        </div>

        <footer style={{ marginTop: 34, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
          DXE Solutions · Permitting &amp; Project Management
        </footer>
      </div>
    </article>
  );
}
