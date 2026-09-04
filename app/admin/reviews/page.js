import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import AdminReviewsList from '@/components/admin/AdminReviewsList';

export default async function AdminReviewsPage() {
  const supabase = createClient();

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, projects(id, name)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Client Reviews</h1>
        <p>Manage submitted reviews and choose which ones appear publicly on the website</p>
      </div>

      <div className={styles.fullWidthCard}>
        <AdminReviewsList initialReviews={reviews || []} />
      </div>
    </div>
  );
}
