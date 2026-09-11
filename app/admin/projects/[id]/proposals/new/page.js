import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ProposalForm from '@/components/admin/ProposalForm';

export default async function NewProposalPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, address, profiles!projects_owner_id_fkey(first_name, last_name, email)')
    .eq('id', params.id)
    .single();

  if (!project) notFound();

  const { data: me } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();
  const preparedByDefault = [me?.first_name, me?.last_name].filter(Boolean).join(' ') || 'DXE Solutions';

  return (
    <div>
      <Link href={`/admin/projects/${params.id}`} className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to project
      </Link>
      <div className={styles.portalHeader}>
        <h1>Create A Proposal</h1>
        <p>{project.name}</p>
      </div>
      <div className={styles.fullWidthCard}>
        <ProposalForm projectId={params.id} project={project} preparedByDefault={preparedByDefault} />
      </div>
    </div>
  );
}
