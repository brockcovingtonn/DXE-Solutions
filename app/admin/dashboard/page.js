import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import { UTILITY_STATUSES, UTILITY_TYPES } from '@/lib/constants';

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

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [
    { data: profiles },
    { data: projects },
    { data: activity },
    { data: milestones },
    { data: utilityEntries },
  ] = await Promise.all([
    supabase.from('profiles').select('id, is_admin'),
    supabase.from('projects').select('id, name, status'),
    supabase
      .from('activity')
      .select('*, projects(id, name)')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('milestones')
      .select('*, projects(id, name)')
      .neq('state', 'done')
      .order('display_date', { ascending: true })
      .limit(8),
    supabase
      .from('project_utility_entries')
      .select('*, project_utilities(utility_type, project_id, projects(id, name))')
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const clientCount = (profiles || []).filter((p) => !p.is_admin).length;
  const activeProjects = (projects || []).filter((p) => p.status === 'active').length;
  const totalProjects = (projects || []).length;

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Dashboard</h1>
        <p>Overview across all clients and projects</p>
      </div>

      <div className={styles.statCards3}>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Clients</div>
          <div className={styles.scValue}>{clientCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Total Projects</div>
          <div className={styles.scValue}>{totalProjects}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Active Projects</div>
          <div className={styles.scValue}>{activeProjects}</div>
        </div>
      </div>

      <div className={styles.portalGrid}>
        <div className={styles.portalCard}>
          <h3>Recent Activity</h3>
          <div className={styles.activityFeed}>
            {(activity || []).map((a) => (
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
            {(!activity || activity.length === 0) && (
              <p style={{ fontSize: '0.85rem', color: '#718096' }}>No recent activity.</p>
            )}
          </div>
        </div>

        <div className={styles.portalCard}>
          <h3>Upcoming Milestones</h3>
          <div className={styles.activityFeed}>
            {(milestones || []).map((m) => (
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
            {(!milestones || milestones.length === 0) && (
              <p style={{ fontSize: '0.85rem', color: '#718096' }}>No upcoming milestones.</p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Utilities Needing Attention</h3>
        {utilityEntries && utilityEntries.length > 0 ? (
          <div className={adminStyles.clientList}>
            {utilityEntries.map((entry) => {
              const utility = entry.project_utilities;
              const typeLabel = UTILITY_TYPES.find((t) => t.value === utility?.utility_type)?.label || utility?.utility_type;
              const statusLabel = UTILITY_STATUSES.find((s) => s.value === entry.status)?.label || entry.status;

              return (
                <Link
                  href={utility?.projects ? `/admin/projects/${utility.projects.id}` : '#'}
                  key={entry.id}
                  className={adminStyles.contactRow}
                >
                  <div className={adminStyles.clientInfo}>
                    <div className={adminStyles.clientName}>
                      {utility?.projects?.name} — {typeLabel}
                    </div>
                    <div className={adminStyles.clientEmail}>
                      {entry.application || 'No application set'}
                      {entry.work_request_number ? ` · WR# ${entry.work_request_number}` : ''}
                    </div>
                  </div>
                  <div className={adminStyles.contactMeta}>
                    <span className={adminStyles.projectChipStatus}>{statusLabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>
            No utility entries currently pending or in progress.
          </p>
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
