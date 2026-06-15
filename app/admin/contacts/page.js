import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';

export default async function ContactsPage() {
  const supabase = createClient();

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*, project_contacts(project_id, projects(id, name))')
    .order('name');

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Contacts</h1>
        <p>People and companies Dixie works with regularly</p>
      </div>

      <div className={adminStyles.actionsRow}>
        <Link href="/admin/contacts/new" className="btn-navy">
          <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i>
          New Contact
        </Link>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>All Contacts ({contacts?.length || 0})</h3>
        {!contacts || contacts.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>
            No contacts yet. Click &quot;New Contact&quot; to add your first one.
          </p>
        ) : (
          <div className={adminStyles.clientList}>
            {contacts.map((contact) => (
              <Link
                href={`/admin/contacts/${contact.id}`}
                key={contact.id}
                className={adminStyles.contactRow}
              >
                <div className={adminStyles.clientInfo}>
                  <div className={adminStyles.clientName}>{contact.name}</div>
                  <div className={adminStyles.clientEmail}>
                    {[contact.trade, contact.company].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <div className={adminStyles.clientProjects}>
                  {(contact.project_contacts || []).map((pc) => (
                    <span className={adminStyles.projectChip} key={pc.project_id}>
                      {pc.projects?.name}
                    </span>
                  ))}
                  {(!contact.project_contacts || contact.project_contacts.length === 0) && (
                    <span style={{ fontSize: '0.78rem', color: '#a0aec0' }}>Not linked to a project</span>
                  )}
                </div>
                <div className={adminStyles.contactMeta}>
                  {contact.phone && <div>{contact.phone}</div>}
                  {contact.email && <div>{contact.email}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
