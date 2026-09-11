import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import EmptyState from '@/components/EmptyState';
import DownloadLink from '@/components/DownloadLink';

export default async function EmployeeTemplatesPage() {
  const supabase = createClient();

  const { data: templates } = await supabase
    .from('document_templates')
    .select('*')
    .eq('shared_with_employees', true)
    .order('name');

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Templates</h1>
        <p>Standard documents Dixie has shared with the team</p>
      </div>

      <div className={styles.fullWidthCard}>
        {!templates || templates.length === 0 ? (
          <EmptyState icon="ti-copy" title="No templates shared yet" subtitle="Check back once Dixie shares a template with employees." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {templates.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.85rem',
                  border: '1px solid rgba(var(--border-rgb),0.1)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--navy)', fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                    {[t.category, t.file_name].filter(Boolean).join(' · ')}
                  </div>
                  {t.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{t.description}</p>
                  )}
                </div>
                <DownloadLink href={`/api/employee/templates/${t.id}/download`} className="btn-navy" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', flexShrink: 0 }}>
                  Download
                </DownloadLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
