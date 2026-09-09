import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import EmptyState from '@/components/EmptyState';

export default async function EmployeeContactsPage() {
  const supabase = createClient();

  // RLS already scopes this to contacts linked to projects the
  // employee is assigned to (client_employee_contacts_migration.sql).
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*, project_contacts(project_id, projects(id, name))')
    .order('name');

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Contacts</h1>
        <p>People and agencies linked to your assigned projects</p>
      </div>

      <div className={styles.fullWidthCard}>
        {!contacts || contacts.length === 0 ? (
          <EmptyState icon="ti-address-book" title="No contacts yet" subtitle="Contacts linked to your assigned projects will show up here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {contacts.map((c) => (
              <div key={c.id} style={{ padding: '0.85rem', border: '1px solid rgba(var(--border-rgb),0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--navy)', fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                      {[c.trade, c.company].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {c.project_contacts && c.project_contacts.length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                      {c.project_contacts.map((pc) => pc.projects?.name).filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--navy)' }}>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} style={{ color: 'var(--navy)' }}>
                      <i className="ti ti-phone" aria-hidden="true"></i> {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ color: 'var(--navy)' }}>
                      <i className="ti ti-mail" aria-hidden="true"></i> {c.email}
                    </a>
                  )}
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noreferrer" style={{ color: 'var(--navy)' }}>
                      <i className="ti ti-world" aria-hidden="true"></i> Website
                    </a>
                  )}
                </div>
                {c.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{c.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
