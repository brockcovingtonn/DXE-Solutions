import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ContactForm from '@/components/admin/ContactForm';

export default async function NewContactPage() {
  const supabase = createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name');

  return (
    <div>
      <Link href="/admin/contacts" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to contacts
      </Link>
      <div className={styles.portalHeader}>
        <h1>New contact</h1>
        <p>Add a person or company Dixie works with</p>
      </div>

      <div className={styles.fullWidthCard}>
        <ContactForm allProjects={projects || []} linkedProjectIds={[]} />
      </div>
    </div>
  );
}
