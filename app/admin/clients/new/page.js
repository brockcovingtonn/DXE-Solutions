import Link from 'next/link';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import NewClientForm from '@/components/NewClientForm';

export default function NewClientPage() {
  return (
    <div>
      <Link href="/admin/clients" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to clients
      </Link>
      <div className={styles.portalHeader}>
        <h1>New Client &amp; Project</h1>
        <p>Create a login for a new client and set up their first project</p>
      </div>

      <div className={styles.fullWidthCard}>
        <NewClientForm />
      </div>
    </div>
  );
}
