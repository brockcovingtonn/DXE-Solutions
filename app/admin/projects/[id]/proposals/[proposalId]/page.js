import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ProposalForm from '@/components/admin/ProposalForm';

export default async function EditProposalPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, address, profiles!projects_owner_id_fkey(first_name, last_name, email)')
    .eq('id', params.id)
    .single();
  if (!project) notFound();

  const { data: proposal } = await supabase.from('proposals').select('*').eq('id', params.proposalId).eq('project_id', params.id).single();
  if (!proposal) notFound();

  // A finalized/sent proposal is a record of what went out — view it instead.
  if (proposal.status !== 'draft') {
    redirect(`/admin/projects/${params.id}/proposals/${params.proposalId}/view`);
  }

  const { data: lineItems } = await supabase.from('proposal_line_items').select('*').eq('proposal_id', params.proposalId).order('sort_order');

  return (
    <div>
      <Link href={`/admin/projects/${params.id}`} className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to project
      </Link>
      <div className={styles.portalHeader}>
        <h1>Edit Proposal</h1>
        <p>{project.name}</p>
      </div>
      <div className={styles.fullWidthCard}>
        <ProposalForm
          projectId={params.id}
          proposalId={params.proposalId}
          initialProposal={proposal}
          initialLineItems={lineItems || []}
          project={project}
          preparedByDefault={proposal.prepared_by}
        />
      </div>
    </div>
  );
}
