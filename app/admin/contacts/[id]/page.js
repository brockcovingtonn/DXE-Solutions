import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ContactForm from '@/components/admin/ContactForm';

export default async function EditContactPage({ params }) {
  const supabase = createClient();

  const { data: contact } = await supabase
    .from('contacts')
    .select('*, project_contacts(project_id)')
    .eq('id', params.id)
    .single();

  if (!contact) notFound();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name');

  const linkedProjectIds = (contact.project_contacts || []).map((pc) => pc.project_id);

  return (
    <div>
      <Link href="/admin/contacts" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to contacts
      </Link>
      <div className={styles.portalHeader}>
        <h1>{contact.name}</h1>
        <p>{[contact.trade, contact.company].filter(Boolean).join(' · ') || 'Edit contact'}</p>
      </div>

      <div className={styles.fullWidthCard}>
        <ContactForm
          contact={contact}
          contactId={contact.id}
          allProjects={projects || []}
          linkedProjectIds={linkedProjectIds}
        />
      </div>
    </div>
  );
}
