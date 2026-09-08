import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import { PERMIT_STATUSES } from '@/lib/constants';

export default async function PermitsPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  const { data: permits } = await supabase.rpc('get_project_permits', {
    p_project_id: projectId,
  });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Permits</h1>
        <p>{project.name} · Permit status</p>
      </div>

      <div className={styles.fullWidthCard}>
        {!permits || permits.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            No permits have been added for this project yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {permits.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  padding: '0.9rem 1rem',
                  border: '1px solid rgba(var(--border-rgb),0.1)',
                }}
              >
                <div>
                  <div className={styles.ufLabel}>Type</div>
                  <div className={styles.ufValue}>{p.permit_type}</div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Permit #</div>
                  <div className={styles.ufValue}>{p.permit_number || '—'}</div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Agency</div>
                  <div className={styles.ufValue}>{p.agency || '—'}</div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Status</div>
                  <div className={styles.ufValue}>
                    {PERMIT_STATUSES.find((s) => s.value === p.status)?.label || p.status}
                  </div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Issued</div>
                  <div className={styles.ufValue}>{p.issued_date || '—'}</div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Expires</div>
                  <div className={styles.ufValue}>{p.expiration_date || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
