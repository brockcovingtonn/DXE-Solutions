import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';

export default async function AdminClientsPage() {
  const supabase = createClient();

  // Get all non-admin profiles (clients)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, is_admin')
    .order('first_name');

  // Get all projects so we can count per client
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, owner_id')
    .order('created_at', { ascending: false });

  const clients = (profiles || []).filter((p) => !p.is_admin);

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
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>
            No clients yet. Click &quot;New Client &amp; Project&quot; to add your first one.
          </p>
        ) : (
          <div className={adminStyles.clientList}>
            {clients.map((client) => (
              <div className={adminStyles.clientRow} key={client.id}>
                <div className={adminStyles.clientInfo}>
                  <div className={adminStyles.clientName}>
                    {client.first_name} {client.last_name}
                  </div>
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
