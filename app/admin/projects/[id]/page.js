import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ProjectInfoForm from '@/components/admin/ProjectInfoForm';
import PhasesEditor from '@/components/admin/PhasesEditor';
import MilestonesEditor from '@/components/admin/MilestonesEditor';
import AdminDocuments from '@/components/admin/AdminDocuments';
import AdminPhotos from '@/components/admin/AdminPhotos';
import AdminNotes from '@/components/admin/AdminNotes';

export default async function AdminProjectPage({ params }) {
  const supabase = createClient();
  const projectId = params.id;

  const { data: project } = await supabase
    .from('projects')
    .select('*, profiles!projects_owner_id_fkey(first_name, last_name, email)')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const [{ data: phases }, { data: milestones }, { data: docs }, { data: photos }, { data: notes }] =
    await Promise.all([
      supabase.from('project_phases').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('photos').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);

  // Generate signed URLs for photos so admin can preview them
  let photosWithUrls = [];
  if (photos && photos.length > 0) {
    photosWithUrls = await Promise.all(
      photos.map(async (p) => {
        const { data } = await supabase.storage
          .from('project-photos')
          .createSignedUrl(p.file_path, 3600);
        return { ...p, url: data?.signedUrl };
      })
    );
  }

  const client = project.profiles;

  return (
    <div>
      <Link href="/admin/clients" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to clients
      </Link>
      <div className={styles.portalHeader}>
        <h1>{project.name}</h1>
        <p>
          {client?.first_name} {client?.last_name} ({client?.email})
        </p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Project details</h3>
        <ProjectInfoForm project={project} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Project phases</h3>
        <PhasesEditor projectId={projectId} initialPhases={phases || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Milestones</h3>
        <MilestonesEditor projectId={projectId} initialMilestones={milestones || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Documents</h3>
        <AdminDocuments projectId={projectId} initialDocs={docs || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Photos</h3>
        <AdminPhotos projectId={projectId} initialPhotos={photosWithUrls} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Notes &amp; updates</h3>
        <AdminNotes projectId={projectId} initialNotes={notes || []} />
      </div>
    </div>
  );
}
