function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Read-only rendering of a bid — shared by the finalize preview modal and
// the "view a finalized bid" page, so what you approve is what you get.
export default function BidDocument({ bid, lineItems }) {
  return (
    <div style={{ background: '#fff', color: '#1a2530', maxWidth: '760px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ background: '#2C3E50', height: '10px' }} />
      <div style={{ background: '#C9A857', height: '3px' }} />
      <div style={{ padding: '2rem 2.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em', color: 'var(--navy)' }}>DXE SOLUTIONS</div>
            <div style={{ fontSize: '0.72rem', color: '#718096' }}>Permitting &amp; Project Management</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem', color: 'var(--navy)' }}>CONSTRUCTION BID</div>
            <div style={{ fontSize: '0.72rem', color: '#718096' }}>Date: {formatDate(bid.created_at || new Date())}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #DCE5EC', margin: '1.25rem 0' }} />

        <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.3rem', color: 'var(--navy)', margin: '0 0 1rem' }}>
          {bid.title || 'Bid'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C9A857', fontWeight: 600, marginBottom: '0.2rem' }}>
              Prepared For
            </div>
            <div style={{ fontSize: '0.88rem' }}>{bid.client_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C9A857', fontWeight: 600, marginBottom: '0.2rem' }}>
              Project Address
            </div>
            <div style={{ fontSize: '0.88rem' }}>{bid.project_address || '—'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#718096', marginBottom: '1.25rem' }}>
          <span>{bid.prepared_by ? `Prepared by: ${bid.prepared_by}` : ''}</span>
          <span>{bid.valid_until ? `Valid until: ${formatDate(bid.valid_until)}` : ''}</span>
        </div>

        {bid.scope_summary && (
          <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: '#2d3748', marginBottom: '1.5rem', whiteSpace: 'pre-line' }}>{bid.scope_summary}</p>
        )}

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
              <span>{formatCurrency(bid.subtotal)}</span>
            </div>
            {Number(bid.adjustment) !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0' }}>
                <span>{bid.adjustment_label || 'Adjustment'}</span>
                <span>{formatCurrency(bid.adjustment)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--navy)', marginTop: '0.3rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)' }}>
              <span>Total</span>
              <span>{formatCurrency(bid.total)}</span>
            </div>
          </div>
        </div>

        {bid.payment_terms && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C9A857', fontWeight: 600, marginBottom: '0.3rem' }}>
              Payment Terms
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{bid.payment_terms}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '2.5rem', marginTop: '3rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '1px solid #A0AEC0', paddingTop: '0.35rem', fontSize: '0.72rem', color: '#718096' }}>Client Signature</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '1px solid #A0AEC0', paddingTop: '0.35rem', fontSize: '0.72rem', color: '#718096' }}>Date</div>
          </div>
        </div>
      </div>
    </div>
  );
}
