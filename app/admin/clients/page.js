import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import EmptyState from '@/components/EmptyState';

export default async function AdminClientsPage() {
  const supabase = createClient();

  // Get all non-admin profiles (clients)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, is_admin, is_employee')
    .order('first_name');

  // Get all projects so we can count per client
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, owner_id')
    .order('created_at', { ascending: false });

  const { data: unread } = await supabase.rpc('get_unread_message_counts');
  const unreadByProject = Object.fromEntries((unread || []).map((r) => [r.project_id, r.unread_count]));

  const clients = (profiles || []).filter((p) => !p.is_admin && !p.is_employee);

  const projectsByClient = {};
  (projects || []).forEach((p) => {
    if (!projectsByClient[p.owner_id]) projectsByClient[p.owner_id] = [];
    projectsByClient[p.owner_id].push(p);
  });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Clients &amp; Projects</h1>
        <p>Manage client accounts and their projects</p>
      </div>

      <div className={adminStyles.actionsRow}>
        <Link href="/admin/clients/new" className="btn-navy">
          <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i>
          New Client &amp; Project
        </Link>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>All Clients ({clients.length})</h3>
        {clients.length === 0 ? (
          <EmptyState icon="ti-users" title="No clients yet" subtitle='Click "New Client & Project" above to add your first one.' />
        ) : (
          <div className={adminStyles.clientList}>
            {clients.map((client) => (
              <div className={adminStyles.clientRow} key={client.id}>
                <div className={adminStyles.clientInfo}>
                  <Link href={`/admin/clients/${client.id}`} className={adminStyles.clientNameLink}>
                    <div className={adminStyles.clientName}>
                      {client.first_name} {client.last_name}
                    </div>
                  </Link>
                  <div className={adminStyles.clientEmail}>{client.email}</div>
                </div>
                <div className={adminStyles.clientProjects}>
                  {(projectsByClient[client.id] || []).map((proj) => (
                    <Link
                      href={`/admin/projects/${proj.id}`}
                      key={proj.id}
                      className={adminStyles.projectChip}
                    >
                      {proj.name}
                      <span className={adminStyles.projectChipStatus}>{proj.status}</span>
                      {unreadByProject[proj.id] > 0 && (
                        <span
                          style={{
                            background: 'var(--gold)',
                            color: 'var(--navy-dark)',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '0.05rem 0.4rem',
                            borderRadius: '999px',
                            marginLeft: '0.4rem',
                          }}
                        >
                          {unreadByProject[proj.id]}
                        </span>
                      )}
                    </Link>
                  ))}
                  {(!projectsByClient[client.id] || projectsByClient[client.id].length === 0) && (
                    <span style={{ fontSize: '0.78rem', color: '#a0aec0' }}>No projects</span>
                  )}
                </div>
                <Link href={`/admin/clients/${client.id}`} className={adminStyles.addProjectLink}>
                  <i className="ti ti-plus" aria-hidden="true"></i> Add project
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
