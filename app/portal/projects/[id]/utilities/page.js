import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import { UTILITY_TYPES, UTILITY_STATUSES } from '@/lib/constants';

export default async function UtilitiesPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  const { data: utilities } = await supabase.rpc('get_project_utilities', {
    p_project_id: projectId,
  });

  const visibleUtilities = (utilities || []).filter((u) => u.enabled);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Utilities</h1>
        <p>{project.name} · Utility coordination status</p>
      </div>

      <div className={styles.fullWidthCard}>
        {visibleUtilities.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>
            No utility information has been added for this project yet.
          </p>
        ) : (
          UTILITY_TYPES.filter((t) => visibleUtilities.some((u) => u.utility_type === t.value)).map(
            (type) => {
              const u = visibleUtilities.find((x) => x.utility_type === type.value);
              const entries = u.entries || [];

              return (
                <div className={styles.utilityBlock} key={type.value}>
                  <div className={styles.utilityHeader}>
                    <i className={`ti ${UTILITY_ICONS[type.value]}`} aria-hidden="true"></i>
                    {type.label}
                  </div>

                  {(u.contact_name || u.contact_trade || u.contact_phone || u.contact_email) && (
                    <div className={styles.utilityContact}>
                      {u.contact_trade && (
                        <span>
                          <strong>{u.contact_trade}</strong>
                        </span>
                      )}
                      {u.contact_name && <span>{u.contact_name}</span>}
                      {u.contact_phone && <span>{u.contact_phone}</span>}
                      {u.contact_email && <span>{u.contact_email}</span>}
                    </div>
                  )}

                  {entries.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: '#a0aec0', marginTop: '0.75rem' }}>
                      No updates yet.
                    </p>
                  ) : (
                    entries.map((entry) => {
                      const statusLabel =
                        UTILITY_STATUSES.find((s) => s.value === entry.status)?.label || entry.status;

                      return (
                        <div className={styles.utilityTable} key={entry.id}>
                          <div className={styles.utilityField}>
                            <div className={styles.ufLabel}>Application</div>
                            <div className={styles.ufValue}>{entry.application || '—'}</div>
                          </div>
                          <div className={styles.utilityField}>
                            <div className={styles.ufLabel}>Work Request #</div>
                            <div className={styles.ufValue}>{entry.work_request_number || '—'}</div>
                          </div>
                          <div className={styles.utilityField}>
                            <div className={styles.ufLabel}>Status</div>
                            <div className={styles.ufValue}>{statusLabel}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            }
          )
        )}
      </div>
    </div>
  );
}

const UTILITY_ICONS = {
  electrical: 'ti-bolt',
  water: 'ti-droplet',
  gas: 'ti-flame',
};
