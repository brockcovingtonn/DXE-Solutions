import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import ClientProposalsList from '@/components/ClientProposalsList';
import styles from '@/components/portal-shared.module.css';

export default async function ClientProposalsPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');
  if (!project) notFound();

  // RLS already limits clients to their own project's non-draft
  // proposals; admins/employees previewing see everything on the
  // project.
  const { data: proposals } = await supabase
    .from('proposals')
    .select('*, proposal_signatures(signer_name, created_at)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();
  const currentUserName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Proposals</h1>
        <p>{project.name} · Scope of work and pricing from DXE Solutions</p>
      </div>

      <div className={styles.fullWidthCard}>
        <ClientProposalsList proposals={proposals} currentUserName={currentUserName} />
      </div>
    </div>
  );
}
