'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SignaturePad from '@/components/SignaturePad';
import EmptyState from '@/components/EmptyState';
import DownloadLink from '@/components/DownloadLink';
import styles from '@/components/portal-shared.module.css';

const BADGE_CLASS = {
  new: styles.badgeNew,
  signed: styles.badgeSigned,
  pending: styles.badgePending,
  contract: styles.badgeContract,
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DocumentsList({ docs, currentUserName }) {
  const router = useRouter();
  const [signingId, setSigningId] = useState(null);

  return (
    <div className={styles.docList}>
      {(docs || []).map((d) => {
        const signature = Array.isArray(d.document_signatures) ? d.document_signatures[0] : d.document_signatures;
        const isPdf = (d.file_type || '').toLowerCase() === 'pdf' || d.file_name?.toLowerCase().endsWith('.pdf');

        return (
          <div key={d.id}>
            <div className={styles.docItem}>
              <div className={styles.docIcon}>
                <i className="ti ti-file-text" aria-hidden="true"></i>
              </div>
              <div style={{ flex: 1 }}>
                <DownloadLink
                  href={`/api/documents/${d.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.docName}
                  style={{ textDecoration: 'none' }}
                >
                  {d.file_name}
                </DownloadLink>
                <div className={styles.docMeta}>
                  {formatDate(d.created_at)} · Uploaded by {d.uploaded_by_role === 'dxe' ? 'DXE' : 'You'}
                </div>
                {signature && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-success)', marginTop: '0.2rem' }}>
                    <i className="ti ti-circle-check" aria-hidden="true"></i> Signed by {signature.signer_name} on{' '}
                    {formatDate(signature.created_at)}
                  </div>
                )}
              </div>
              <span className={`${styles.docBadge} ${BADGE_CLASS[d.badge] || ''}`}>{d.badge}</span>
              <DownloadLink
                href={`/api/documents/${d.id}/download?download=1`}
                style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginLeft: '0.75rem', cursor: 'pointer' }}
                title="Download"
              >
                <i className="ti ti-download" aria-hidden="true"></i>
              </DownloadLink>
              {isPdf && !signature && (
                <button
                  type="button"
                  onClick={() => setSigningId(signingId === d.id ? null : d.id)}
                  style={{
                    marginLeft: '0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--navy)',
                    fontWeight: 500,
                    background: 'none',
                    border: '1px solid rgba(var(--border-rgb),0.2)',
                    padding: '0.35rem 0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  Sign Document
                </button>
              )}
            </div>
            {signingId === d.id && (
              <SignaturePad
                documentId={d.id}
                defaultName={currentUserName}
                onCancel={() => setSigningId(null)}
                onSigned={() => {
                  setSigningId(null);
                  router.refresh();
                }}
              />
            )}
          </div>
        );
      })}
      {(!docs || docs.length === 0) && (
        <EmptyState icon="ti-file-text" title="No documents yet" subtitle="Files DXE shares with you will show up here." />
      )}
    </div>
  );
}
