import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ProposalDocument from '@/components/admin/ProposalDocument';
import ProposalViewActions from '@/components/admin/ProposalViewActions';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function ViewProposalPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', params.id).single();
  if (!project) notFound();

  const { data: proposal } = await supabase.from('proposals').select('*').eq('id', params.proposalId).eq('project_id', params.id).single();
  if (!proposal) notFound();

  if (proposal.status === 'draft') {
    redirect(`/admin/projects/${params.id}/proposals/${params.proposalId}`);
  }

  const { data: lineItems } = await supabase.from('proposal_line_items').select('*').eq('proposal_id', params.proposalId).order('sort_order');

  return (
    <div>
      <Link href={`/admin/projects/${params.id}`} className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to project
      </Link>
      <div className={styles.portalHeader}>
        <h1>{proposal.title}</h1>
        <p>
          {project.name}
          {proposal.status === 'sent' && proposal.sent_at && ` · Sent ${formatDate(proposal.sent_at)} to ${proposal.sent_to_email}`}
          {proposal.status === 'finalized' && proposal.finalized_at && ` · Finalized ${formatDate(proposal.finalized_at)}, not yet sent`}
        </p>
      </div>

      <div className={styles.fullWidthCard}>
        <ProposalViewActions proposalId={params.proposalId} projectId={params.id} hasPdf={Boolean(proposal.pdf_path)} />
      </div>

      <div className={styles.fullWidthCard} style={{ background: '#DCE5EC', padding: '1.5rem' }}>
        <ProposalDocument proposal={proposal} lineItems={lineItems || []} />
      </div>
    </div>
  );
}
