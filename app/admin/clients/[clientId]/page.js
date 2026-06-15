import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import NewProjectForm from '@/components/NewProjectForm';
import ClientInfoForm from '@/components/admin/ClientInfoForm';

export default async function ClientDetailPage({ params }) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone')
    .eq('id', params.clientId)
    .single();

  if (!client) notFound();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, project_type')
    .eq('owner_id', client.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <Link href="/admin/clients" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to clients
      </Link>
      <div className={styles.portalHeader}>
        <h1>{client.first_name} {client.last_name}</h1>
        <p>{client.email}</p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Client details</h3>
        <ClientInfoForm client={client} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Projects</h3>
        {projects && projects.length > 0 ? (
          <div className={adminStyles.clientProjects} style={{ marginBottom: '1rem' }}>
            {projects.map((proj) => (
              <Link
                href={`/admin/projects/${proj.id}`}
                key={proj.id}
                className={adminStyles.projectChip}
              >
                {proj.name}
                <span className={adminStyles.projectChipStatus}>{proj.status}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '1rem' }}>
            No projects yet.
          </p>
        )}
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Add a new project</h3>
        <NewProjectForm clientId={client.id} />
      </div>
    </div>
  );
}
