import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';

export default async function PhotosPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .single();

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
        <div className={styles.photosGrid}>
          {photosWithUrls.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="ti ti-photo-off" aria-hidden="true"></i>
              <p>No photos uploaded yet for this project.</p>
            </div>
          ) : (
            photosWithUrls.map((p) => (
              <div
                className={styles.photoItem}
                key={p.id}
                style={{
                  backgroundImage: p.url ? `url(${p.url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  background: p.url ? undefined : 'var(--navy-mid)',
                }}
              >
                {!p.url && (
                  <div className={styles.photoPlaceholder}>
                    <i className="ti ti-photo" aria-hidden="true"></i>
                    <span>Photo</span>
                  </div>
                )}
                {p.caption && <div className={styles.photoTag}>{p.caption}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
