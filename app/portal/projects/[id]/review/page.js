import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import ReviewForm from '@/components/ReviewForm';

export default async function ReviewPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  const { data: review } = await supabase
    .from('reviews')
    .select('*')
    .eq('project_id', projectId)
    .eq('client_id', user.id)
    .maybeSingle();

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Leave a Review</h1>
        <p>{project.name} · Share your experience working with DXE Solutions</p>
      </div>

      <div className={styles.fullWidthCard} style={{ maxWidth: '640px' }}>
        <ReviewForm projectId={projectId} initialReview={review} />
      </div>
    </div>
  );
}
