import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import EmptyState from '@/components/EmptyState';
import { UTILITY_STATUSES, UTILITY_TYPES } from '@/lib/constants';

export default async function AdminUtilitiesPage() {
  const supabase = createClient();

  const { data: utilityEntries } = await supabase
    .from('project_utility_entries')
    .select('*, project_utilities(utility_type, project_id, projects(id, name))')
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(150);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Utilities Needing Attention</h1>
        <p>Every pending or in-progress utility entry across every project</p>
      </div>

      <div className={styles.fullWidthCard}>
        {(utilityEntries || []).length === 0 ? (
          <EmptyState icon="ti-bolt" title="Nothing pending" subtitle="Utility entries needing attention will show up here." />
        ) : (
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
        )}
      </div>
    </div>
  );
}
