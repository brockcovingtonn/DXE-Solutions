import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentsList from '@/components/DocumentsList';
import ViewEditSection from '@/components/ViewEditSection';

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

      <ViewEditSection
        title="All Project Documents"
        actionLabel="Add"
        edit={<DocumentUpload projectId={projectId} bare />}
        view={<DocumentsList docs={docs} currentUserName={currentUserName} />}
      />
    </div>
  );
}
