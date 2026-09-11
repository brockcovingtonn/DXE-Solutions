import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import BidForm from '@/components/admin/BidForm';

export default async function EditBidPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, address, profiles!projects_owner_id_fkey(first_name, last_name, email)')
    .eq('id', params.id)
    .single();
  if (!project) notFound();

  const { data: bid } = await supabase.from('bids').select('*').eq('id', params.bidId).eq('project_id', params.id).single();
  if (!bid) notFound();

  // A finalized/sent bid is a record of what went out — view it instead.
  if (bid.status !== 'draft') {
    redirect(`/admin/projects/${params.id}/bids/${params.bidId}/view`);
  }

  const { data: lineItems } = await supabase.from('bid_line_items').select('*').eq('bid_id', params.bidId).order('sort_order');

  return (
    <div>
      <Link href={`/admin/projects/${params.id}`} className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to project
      </Link>
      <div className={styles.portalHeader}>
        <h1>Edit Bid</h1>
        <p>{project.name}</p>
      </div>
      <div className={styles.fullWidthCard}>
        <BidForm
          projectId={params.id}
          bidId={params.bidId}
          initialBid={bid}
          initialLineItems={lineItems || []}
          project={project}
          preparedByDefault={bid.prepared_by}
        />
      </div>
    </div>
  );
}
