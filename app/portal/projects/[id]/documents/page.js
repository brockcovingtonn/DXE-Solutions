import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentsList from '@/components/DocumentsList';

export default async function DocumentsPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  const [{ data: docs }, { data: profile }] = await Promise.all([
    supabase
      .from('documents')
      .select('*, document_signatures(signer_name, created_at)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
  ]);

  const currentUserName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Documents</h1>
        <p>
          {project.name} · {docs?.length || 0} files on record
        </p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>All Project Documents</h3>
        <DocumentsList docs={docs} currentUserName={currentUserName} />
      </div>

      <DocumentUpload projectId={projectId} />
    </div>
  );
}
