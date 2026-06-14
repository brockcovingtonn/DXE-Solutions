import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import NewProjectForm from '@/components/NewProjectForm';

export default async function AddProjectPage({ params }) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('id', params.clientId)
    .single();

  if (!client) notFound();

  return (
    <div>
      <Link href="/admin/clients" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to clients
      </Link>
      <div className={styles.portalHeader}>
        <h1>New project</h1>
        <p>
          For {client.first_name} {client.last_name} ({client.email})
        </p>
      </div>

      <div className={styles.fullWidthCard}>
        <NewProjectForm clientId={client.id} />
      </div>
    </div>
  );
}
