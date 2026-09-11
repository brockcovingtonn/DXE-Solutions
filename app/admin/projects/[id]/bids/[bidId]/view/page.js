import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import BidDocument from '@/components/admin/BidDocument';
import BidViewActions from '@/components/admin/BidViewActions';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function ViewBidPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', params.id).single();
  if (!project) notFound();

  const { data: bid } = await supabase.from('bids').select('*').eq('id', params.bidId).eq('project_id', params.id).single();
  if (!bid) notFound();

  if (bid.status === 'draft') {
    redirect(`/admin/projects/${params.id}/bids/${params.bidId}`);
  }

  const { data: lineItems } = await supabase.from('bid_line_items').select('*').eq('bid_id', params.bidId).order('sort_order');

  return (
    <div>
      <Link href={`/admin/projects/${params.id}`} className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to project
      </Link>
      <div className={styles.portalHeader}>
        <h1>{bid.title}</h1>
        <p>
          {project.name}
          {bid.status === 'sent' && bid.sent_at && ` · Sent ${formatDate(bid.sent_at)} to ${bid.sent_to_email}`}
          {bid.status === 'finalized' && bid.finalized_at && ` · Finalized ${formatDate(bid.finalized_at)}, not yet sent`}
        </p>
      </div>

      <div className={styles.fullWidthCard}>
        <BidViewActions bidId={params.bidId} projectId={params.id} hasPdf={Boolean(bid.pdf_path)} />
      </div>

      <div className={styles.fullWidthCard} style={{ background: '#DCE5EC', padding: '1.5rem' }}>
        <BidDocument bid={bid} lineItems={lineItems || []} />
      </div>
    </div>
  );
}
