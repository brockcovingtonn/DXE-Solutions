import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ContactCategoryFilter from '@/components/admin/ContactCategoryFilter';

export default async function ContactsPage({ searchParams }) {
  const supabase = createClient();
  const categoryFilter = searchParams?.category;

  let query = supabase
    .from('contacts')
    .select('*, project_contacts(project_id, projects(id, name))')
    .order('name');

  if (categoryFilter) {
    query = query.eq('trade', categoryFilter);
  }

  const { data: contacts } = await query;

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Contacts</h1>
        <p>People and companies Dixie works with regularly</p>
      </div>

      <div className={adminStyles.actionsRow} style={{ justifyContent: 'space-between' }}>
        <ContactCategoryFilter current={categoryFilter} />
        <Link href="/admin/contacts/new" className="btn-navy">
          <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i>
          New Contact
        </Link>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>
          {categoryFilter ? `${categoryFilter} Contacts` : 'All Contacts'} ({contacts?.length || 0})
        </h3>
        {!contacts || contacts.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>
            {categoryFilter
              ? `No contacts in "${categoryFilter}" yet.`
              : 'No contacts yet. Click "New Contact" to add your first one.'}
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
