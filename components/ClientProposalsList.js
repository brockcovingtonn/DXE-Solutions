'use client';

import Link from 'next/link';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ClientProposalsList({ proposals, projectId }) {
  if (!proposals || proposals.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No proposals have been shared on this project yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {proposals.map((proposal) => {
        const signature = Array.isArray(proposal.proposal_signatures) ? proposal.proposal_signatures[0] : proposal.proposal_signatures;
        const decline = Array.isArray(proposal.proposal_declines) ? proposal.proposal_declines[0] : proposal.proposal_declines;

        return (
          <Link
            key={proposal.id}
            href={`/portal/projects/${projectId}/proposals/${proposal.id}`}
            style={{ border: '1px solid rgba(var(--border-rgb),0.1)', display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(62,84,104,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-file-description" style={{ color: 'var(--navy)' }} aria-hidden="true"></i>
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--navy)' }}>{proposal.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                  {proposal.status === 'sent' ? `Sent ${formatDate(proposal.sent_at)}` : `Shared ${formatDate(proposal.finalized_at)}`}
                  {proposal.valid_until ? ` · Valid until ${formatDate(proposal.valid_until)}` : ''}
                </div>
                {signature ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-success)', marginTop: '0.2rem' }}>
                    <i className="ti ti-circle-check" aria-hidden="true"></i> Signed by {signature.signer_name} on {formatDate(signature.created_at)}
                  </div>
                ) : decline ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--warn, #A8562F)', marginTop: '0.2rem' }}>
                    Declined{decline.reason ? ` — ${decline.reason}` : ''}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: 'var(--gold)', marginTop: '0.2rem' }}>Awaiting your response</div>
                )}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>{formatCurrency(proposal.total)}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
