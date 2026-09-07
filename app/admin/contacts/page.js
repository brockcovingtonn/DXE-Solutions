import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ContactCategoryFilter from '@/components/admin/ContactCategoryFilter';
import ContactsList from '@/components/admin/ContactsList';
import EmptyState from '@/components/EmptyState';

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
          <EmptyState
            icon="ti-address-book"
            title={categoryFilter ? `No contacts in "${categoryFilter}" yet` : 'No contacts yet'}
            subtitle={categoryFilter ? 'Try a different category.' : 'Click "New Contact" above to add your first one.'}
          />
        ) : (
          <ContactsList contacts={contacts} />
        )}
      </div>
    </div>
  );
}
