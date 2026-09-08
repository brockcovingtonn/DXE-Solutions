import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import EmptyState from '@/components/EmptyState';

const ICONS = {
  note: 'ti-notes',
  doc: 'ti-file',
  status: 'ti-check',
  photo: 'ti-photo',
};

const ICON_CLASS_KEYS = {
  note: 'actIconNote',
  doc: 'actIconDoc',
  status: 'actIconStatus',
  photo: 'actIconPhoto',
};

export default async function AdminActivityPage() {
  const supabase = createClient();

  const { data: activity } = await supabase
    .from('activity')
    .select('*, projects(id, name)')
    .order('created_at', { ascending: false })
    .limit(150);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>All Activity</h1>
        <p>Everything happening across every client and project</p>
      </div>

      <div className={styles.fullWidthCard}>
        {(activity || []).length === 0 ? (
          <EmptyState icon="ti-activity" title="No activity yet" subtitle="Activity across all projects will show up here." />
        ) : (
          <div className={styles.activityFeed}>
            {activity.map((a) => (
              <Link
                href={a.projects ? `/admin/projects/${a.projects.id}` : '#'}
                className={adminStyles.dashboardActivityLink}
                key={a.id}
              >
                <div className={styles.activityItem}>
                  <div className={`${styles.actIcon} ${styles[ICON_CLASS_KEYS[a.type]] || ''}`}>
                    <i className={`ti ${ICONS[a.type] || 'ti-info-circle'}`} aria-hidden="true"></i>
                  </div>
                  <div>
                    <div className={styles.actTitle}>{a.text}</div>
                    <div className={styles.actTime}>
                      {a.projects?.name ? `${a.projects.name} · ` : ''}
                      {formatRelative(a.created_at)}
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

function formatRelative(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
