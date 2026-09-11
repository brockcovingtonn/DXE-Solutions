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

const gold = { fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C9A857', fontWeight: 600, marginBottom: '0.3rem' };

// Read-only rendering of a proposal — a cover letter followed by the
// formal proposal (project info, scope of services, compensation
// breakdown, payment terms, limitations, signature block), matching
// DXE's own proposal-letter format. Shared by the finalize preview
// modal, the admin "view" page, and the client portal.
export default function ProposalDocument({ proposal, lineItems }) {
  return (
    <div style={{ background: '#fff', color: '#1a2530', maxWidth: '760px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ background: '#2C3E50', height: '10px' }} />
      <div style={{ background: '#C9A857', height: '3px' }} />
      <div style={{ padding: '2rem 2.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em', color: 'var(--navy)' }}>DXE SOLUTIONS</div>
          <div style={{ fontSize: '0.78rem', color: '#718096' }}>{formatDate(proposal.created_at || new Date())}</div>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#718096', marginBottom: '1.75rem' }}>Permitting &amp; Project Management</div>

        <p style={{ fontSize: '0.9rem', marginBottom: '0.85rem' }}>Dear {firstName(proposal.client_name)},</p>

        {proposal.intro_paragraph && (
          <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: '#2d3748', marginBottom: '0.85rem', whiteSpace: 'pre-line' }}>{proposal.intro_paragraph}</p>
        )}

        <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>We look forward to the opportunity to support your project.</p>
        <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>Sincerely,</p>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1.75rem' }}>{proposal.prepared_by || 'DXE Solutions'}</p>

        <hr style={{ border: 'none', borderTop: '1px solid #DCE5EC', margin: '0 0 1.5rem' }} />

        <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.3rem', color: 'var(--navy)', margin: '0 0 0.5rem' }}>
          PROPOSAL — {proposal.title || 'Scope of Work'}
        </h3>
        <p style={{ fontSize: '0.72rem', color: '#718096', marginBottom: '1.5rem' }}>
          Project: {proposal.title} &nbsp;·&nbsp; Project Address: {proposal.project_address || '—'} &nbsp;·&nbsp; Client: {proposal.client_name || '—'} &nbsp;·&nbsp; Date: {formatDate(proposal.created_at || new Date())}
        </p>

        {proposal.scope_summary && (
          <>
            <div style={gold}>Project Description</div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: '#2d3748', marginBottom: '1.25rem', whiteSpace: 'pre-line' }}>{proposal.scope_summary}</p>
          </>
        )}

        {lineItems && lineItems.length > 0 && (
          <>
            <div style={gold}>Scope of Services</div>
            <ul style={{ margin: '0 0 1.5rem', paddingLeft: '1.1rem', fontSize: '0.84rem', lineHeight: 1.8, color: '#2d3748' }}>
              {lineItems.map((item) => (
                <li key={item.id || `${item.category}-${item.description}`}>
                  {item.category && <strong>{item.category}</strong>}
                  {item.category && item.description ? ' — ' : ''}
                  {item.description}
                </li>
              ))}
            </ul>
          </>
        )}

        <div style={gold}>Compensation Breakdown</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ background: '#F6F8FA' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.68rem', letterSpacing: '0.05em', color: 'var(--navy)' }}>DESCRIPTION</th>
              <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.68rem', letterSpacing: '0.05em', color: 'var(--navy)' }}>QTY</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.68rem', letterSpacing: '0.05em', color: 'var(--navy)' }}>UNIT</th>
              <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.68rem', letterSpacing: '0.05em', color: 'var(--navy)' }}>UNIT PRICE</th>
              <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.68rem', letterSpacing: '0.05em', color: 'var(--navy)' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(lineItems || []).map((item) => (
              <tr key={item.id || `${item.category}-${item.description}`} style={{ borderBottom: '1px solid #EDF1F4' }}>
                <td style={{ padding: '0.55rem 0.5rem' }}>
                  {item.category && <strong>{item.category}</strong>}
                  {item.category && item.description ? ' — ' : ''}
                  {item.description}
                </td>
                <td style={{ padding: '0.55rem 0.5rem', textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ padding: '0.55rem 0.5rem' }}>{item.unit}</td>
                <td style={{ padding: '0.55rem 0.5rem', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ padding: '0.55rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(proposal.subtotal)}</span>
            </div>
            {Number(proposal.adjustment) !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0' }}>
                <span>{proposal.adjustment_label || 'Adjustment'}</span>
                <span>{formatCurrency(proposal.adjustment)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--navy)', marginTop: '0.3rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)' }}>
              <span>Total</span>
              <span>{formatCurrency(proposal.total)}</span>
            </div>
          </div>
        </div>

        {proposal.payment_terms && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={gold}>Payment Terms</div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{proposal.payment_terms}</p>
          </div>
        )}

        {proposal.valid_until && (
          <p style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#718096', marginTop: '0.5rem' }}>
            This proposal is valid until {formatDate(proposal.valid_until)}.
          </p>
        )}

        {proposal.limitations && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={gold}>Limitations of Responsibility</div>
            <p style={{ fontSize: '0.76rem', lineHeight: 1.6, color: '#718096', whiteSpace: 'pre-line' }}>{proposal.limitations}</p>
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <div style={gold}>Authorization</div>
        </div>
        <div style={{ display: 'flex', gap: '2.5rem', marginTop: '1.25rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '1px solid #A0AEC0', paddingTop: '0.35rem', fontSize: '0.72rem', color: '#718096' }}>Client Signature</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '1px solid #A0AEC0', paddingTop: '0.35rem', fontSize: '0.72rem', color: '#718096' }}>Date</div>
          </div>
        </div>
        <div style={{ marginTop: '1.75rem', width: '220px' }}>
          <div style={{ borderTop: '1px solid #A0AEC0', paddingTop: '0.35rem', fontSize: '0.72rem', color: '#718096' }}>
            {proposal.prepared_by || 'DXE Solutions'}, DXE Solutions
          </div>
        </div>
      </div>
    </div>
  );
}
