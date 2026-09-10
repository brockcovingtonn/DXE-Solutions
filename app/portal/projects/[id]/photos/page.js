import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import EmptyState from '@/components/EmptyState';
import PhotoGrid from '@/components/PhotoGrid';

export default async function PhotosPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  // Generate signed URLs for each photo
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

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Progress Photos</h1>
        <p>{project.name} · Updated by your project manager</p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Site Progress Photos</h3>
        {photosWithUrls.length === 0 ? (
          <EmptyState icon="ti-photo-off" title="No photos yet" subtitle="Your project manager will post progress photos here as work begins." />
        ) : (
          <PhotoGrid
            photos={photosWithUrls}
            renderOverlay={(p) =>
              p.url ? (
                <a
                  href={`/api/photos/${p.id}/download`}
                  title="Download"
                  style={{
                    position: 'absolute',
                    top: '0.4rem',
                    right: '0.4rem',
                    background: 'rgba(62,84,104,0.85)',
                    color: 'var(--gold-light)',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="ti ti-download" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
                </a>
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}
