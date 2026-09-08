import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import EmptyState from '@/components/EmptyState';

export default async function AdminMilestonesPage() {
  const supabase = createClient();

  const { data: milestones } = await supabase
    .from('milestones')
    .select('*, projects(id, name)')
    .neq('state', 'done')
    .order('display_date', { ascending: true })
    .limit(150);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Upcoming Milestones</h1>
        <p>Every open milestone across every project</p>
      </div>

      <div className={styles.fullWidthCard}>
        {(milestones || []).length === 0 ? (
          <EmptyState icon="ti-flag" title="No upcoming milestones" subtitle="Open milestones across all projects will show up here." />
        ) : (
          <div className={styles.activityFeed}>
            {milestones.map((m) => (
              <Link
                href={m.projects ? `/admin/projects/${m.projects.id}` : '#'}
                className={adminStyles.dashboardActivityLink}
                key={m.id}
              >
                <div className={styles.activityItem}>
                  <div className={`${styles.actIcon} ${m.state === 'active' ? styles.actIconStatus : styles.actIconNote}`}>
                    <i className="ti ti-flag" aria-hidden="true"></i>
                  </div>
                  <div>
                    <div className={styles.actTitle}>{m.name}</div>
                    <div className={styles.actTime}>
                      {m.projects?.name ? `${m.projects.name} · ` : ''}
                      {m.display_date || 'No date set'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
