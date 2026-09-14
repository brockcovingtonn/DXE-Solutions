import Link from 'next/link';
import styles from '@/components/portal-shared.module.css';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);
}

// Ties proposals -> payment schedule -> accounting together for a
// client, who otherwise has no reason to know those three screens are
// related. Built only from what a client can actually see (their own
// visible proposals + invoices) — the payment schedule itself is
// admin-only, so it's referenced in the copy rather than as a step of
// its own. Shows on the project Overview page and stays up until
// there's nothing left to act on, rather than a one-time dismissible
// tour — a client who hasn't signed yet should keep seeing this every
// visit, not just once.
export default function WhatsNextChecklist({ projectId, proposals, unpaidTotal, unpaidCount }) {
  const visibleProposals = (proposals || []).filter((p) => p.status !== 'draft');
  if (visibleProposals.length === 0 && unpaidCount === 0) return null;

  const hasUnsignedProposal = visibleProposals.some((p) => !p.signed_at);
  const proposalsDone = visibleProposals.length > 0 && !hasUnsignedProposal;
  const paymentDone = unpaidCount === 0;

  if (proposalsDone && paymentDone) return null;

  const proposalsHref = `/portal/projects/${projectId}/proposals`;
  const accountingHref = `/portal/projects/${projectId}/accounting`;

  return (
    <div className={styles.fullWidthCard}>
      <h3>What&apos;s Next</h3>
      <div className={styles.statusSteps}>
        {visibleProposals.length > 0 && (
          <div className={styles.statusStep}>
            <div className={`${styles.stepDot} ${proposalsDone ? styles.stepDotDone : styles.stepDotActive}`}>
              {proposalsDone ? <i className="ti ti-check" style={{ fontSize: '0.75rem' }}></i> : '1'}
            </div>
            <div>
              <div className={styles.stepName}>{proposalsDone ? 'Proposal signed' : 'Review and sign your proposal'}</div>
              <div className={styles.stepNotes}>
                {proposalsDone
                  ? 'Invoices will be sent automatically per your agreed payment schedule.'
                  : 'Once signed, invoices will be sent automatically per the agreed payment schedule.'}
              </div>
              {!proposalsDone && (
                <Link href={proposalsHref} className={styles.cardAction} style={{ display: 'inline-block', marginTop: '0.4rem' }}>
                  Review proposal →
                </Link>
              )}
            </div>
          </div>
        )}

        <div className={styles.statusStep}>
          <div className={`${styles.stepDot} ${paymentDone ? styles.stepDotDone : styles.stepDotActive}`}>
            {paymentDone ? <i className="ti ti-check" style={{ fontSize: '0.75rem' }}></i> : visibleProposals.length > 0 ? '2' : '1'}
          </div>
          <div>
            <div className={styles.stepName}>{paymentDone ? "You're caught up on payments" : 'Pay your invoice'}</div>
            {!paymentDone && (
              <>
                <div className={styles.stepNotes}>
                  {unpaidCount} invoice{unpaidCount === 1 ? '' : 's'} totaling {formatCurrency(unpaidTotal)}.
                </div>
                <Link href={accountingHref} className={styles.cardAction} style={{ display: 'inline-block', marginTop: '0.4rem' }}>
                  View accounting →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
