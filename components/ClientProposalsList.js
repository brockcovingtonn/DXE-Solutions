'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SignaturePad from '@/components/SignaturePad';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ClientProposalsList({ proposals, currentUserName }) {
  const router = useRouter();
  const [signingId, setSigningId] = useState(null);

  if (!proposals || proposals.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No proposals have been shared on this project yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {proposals.map((proposal) => {
        const signature = Array.isArray(proposal.proposal_signatures) ? proposal.proposal_signatures[0] : proposal.proposal_signatures;

        return (
          <div key={proposal.id} style={{ border: '1px solid rgba(var(--border-rgb),0.1)' }}>
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
                {signature && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-success)', marginTop: '0.2rem' }}>
                    <i className="ti ti-circle-check" aria-hidden="true"></i> Signed by {signature.signer_name} on {formatDate(signature.created_at)}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>{formatCurrency(proposal.total)}</div>
              {proposal.pdf_path && (
                <a
                  href={`/api/proposals/${proposal.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  title="View proposal"
                  style={{ color: 'var(--gold)', fontSize: '1.1rem', flexShrink: 0 }}
                >
                  <i className="ti ti-external-link" aria-hidden="true"></i>
                </a>
              )}
              {proposal.pdf_path && !signature && (
                <button
                  type="button"
                  onClick={() => setSigningId(signingId === proposal.id ? null : proposal.id)}
                  className="btn-navy"
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  Sign Proposal
                </button>
              )}
            </div>
            {signingId === proposal.id && (
              <div style={{ padding: '0 1rem 1rem' }}>
                <SignaturePad
                  signUrl={`/api/proposals/${proposal.id}/sign`}
                  defaultName={currentUserName}
                  onCancel={() => setSigningId(null)}
                  onSigned={() => {
                    setSigningId(null);
                    router.refresh();
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
