import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin as designStudioAdmin } from '@/lib/design-studio/server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import NewProjectForm from '@/components/NewProjectForm';
import ClientInfoForm from '@/components/admin/ClientInfoForm';
import SendWelcomeEmail from '@/components/admin/SendWelcomeEmail';
import SetClientPassword from '@/components/admin/SetClientPassword';
import DangerDeleteButton from '@/components/admin/DangerDeleteButton';

const DS_STATUS_STYLE = {
  draft: { background: 'rgba(201,168,87,0.15)', color: '#7a5c0a' },
  sent: { background: 'rgba(62,84,104,0.12)', color: 'var(--navy)' },
  accepted: { background: 'rgba(16,185,129,0.12)', color: 'var(--text-success)' },
  declined: { background: 'rgba(148,163,184,0.15)', color: 'var(--text-tertiary)' },
  expired: { background: 'rgba(148,163,184,0.15)', color: 'var(--text-tertiary)' },
};

export default async function ClientDetailPage({ params }) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone, email_notifications')
    .eq('id', params.clientId)
    .single();

  if (!client) notFound();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, project_type')
    .eq('owner_id', client.id)
    .order('created_at', { ascending: false });

  // Design Studio tables are RLS-enabled with no policies (service-role +
  // app-layer staff checks only), same as the project page's equivalent query.
  const { data: designStudioQuotes } = await designStudioAdmin()
    .from('design_studio_quotes')
    .select('id, quote_number, status, total, created_at')
    .eq('client_id', client.id)
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
        <h3>Client portal</h3>
        <SendWelcomeEmail clientId={client.id} />
        <SetClientPassword clientId={client.id} />
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
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No projects yet.
          </p>
        )}
      </div>

      {designStudioQuotes && designStudioQuotes.length > 0 && (
        <div className={styles.fullWidthCard}>
          <h3>Design Studio Quotes</h3>
          {designStudioQuotes.map((q) => (
            <Link
              key={q.id}
              href={`/design-studio/${q.id}`}
              className={adminStyles.listRow}
              style={{ textDecoration: 'none' }}
            >
              <span className={adminStyles.listRowPill} style={DS_STATUS_STYLE[q.status] || DS_STATUS_STYLE.draft}>
                {q.status}
              </span>
              <div className={adminStyles.listRowMain}>
                <div className={adminStyles.listRowTitle}>{q.quote_number}</div>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(q.total || 0)}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className={styles.fullWidthCard}>
        <h3>Add a new project</h3>
        <NewProjectForm clientId={client.id} />
      </div>

      <DangerDeleteButton
        heading="Delete this client"
        description="Removes the client's account and portal access. Their projects are kept, but left with no client attached — you can reassign them later."
        buttonText="Delete client"
        endpoint={`/api/admin/clients/${client.id}`}
        redirectTo="/admin/clients"
      />
    </div>
  );
}
