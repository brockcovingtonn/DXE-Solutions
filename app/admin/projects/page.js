import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import EmptyState from '@/components/EmptyState';
import ClientsProjectsTabs from '@/components/admin/ClientsProjectsTabs';

export default async function AdminProjectsPage({ searchParams }) {
  const supabase = createClient();
  const statusFilter = searchParams?.status;

  let query = supabase
    .from('projects')
    .select('id, name, address, project_type, status, progress_pct, profiles!projects_owner_id_fkey(first_name, last_name)')
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const [{ data: projects }, { data: unread }] = await Promise.all([
    query,
    supabase.rpc('get_unread_message_counts'),
  ]);

  const unreadByProject = Object.fromEntries((unread || []).map((r) => [r.project_id, r.unread_count]));

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Clients &amp; Projects</h1>
        <p>
          {statusFilter ? `Showing ${statusFilter} projects` : 'Every project across all clients'}
          {statusFilter && (
            <>
              {' · '}
              <Link href="/admin/projects" style={{ color: 'var(--gold)' }}>
                Clear filter
              </Link>
            </>
          )}
        </p>
      </div>

      <ClientsProjectsTabs />

      <div className={styles.fullWidthCard}>
        {!projects || projects.length === 0 ? (
          <EmptyState icon="ti-folder" title="No projects found" subtitle="Try a different filter, or add a new client and project." />
        ) : (
          <div className={adminStyles.clientList}>
            {projects.map((p) => (
              <Link href={`/admin/projects/${p.id}`} key={p.id} className={adminStyles.contactRow}>
                <div className={adminStyles.clientInfo}>
                  <div className={adminStyles.clientName}>{p.name}</div>
                  <div className={adminStyles.clientEmail}>
                    {p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : 'No client'}
                    {p.address ? ` · ${p.address}` : ''}
                  </div>
                </div>
                <div className={adminStyles.contactMeta}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginRight: '0.75rem' }}>{p.project_type}</span>
                  <span className={adminStyles.projectChipStatus}>{p.status}</span>
                  {unreadByProject[p.id] > 0 && (
                    <span
                      style={{
                        background: 'var(--gold)',
                        color: 'var(--navy-dark)',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '0.05rem 0.4rem',
                        borderRadius: '999px',
                        marginLeft: '0.6rem',
                      }}
                    >
                      {unreadByProject[p.id]}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
