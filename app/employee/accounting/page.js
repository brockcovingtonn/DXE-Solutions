import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import EmployeeAccountingForm from '@/components/EmployeeAccountingForm';

export default async function EmployeeAccountingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: assignments }, { data: entries }] = await Promise.all([
    supabase.from('project_employees').select('projects(id, name)').eq('employee_id', user.id),
    supabase
      .from('invoices')
      .select('*, projects(name)')
      .eq('created_by', user.id)
      .in('kind', ['reimbursement', 'receipt'])
      .order('created_at', { ascending: false }),
  ]);

  const projects = (assignments || []).map((a) => a.projects).filter(Boolean);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Accounting</h1>
        <p>Submit a reimbursement or a project-related expense for admin approval</p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Submit an entry</h3>
        <EmployeeAccountingForm projects={projects} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Your submissions ({entries?.length || 0})</h3>
        {!entries || entries.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nothing submitted yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {entries.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  border: '1px solid rgba(var(--border-rgb),0.1)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.5rem',
                    background: item.kind === 'receipt' ? 'rgba(59,130,246,0.12)' : 'rgba(147,51,234,0.12)',
                    color: item.kind === 'receipt' ? '#1e40af' : '#7e22ce',
                    flexShrink: 0,
                  }}
                >
                  {item.kind}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--navy)', fontWeight: 500 }}>{item.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                    {item.projects?.name || 'General'}
                    {' · '}
                    <span
                      style={{
                        color:
                          item.approval_status === 'approved'
                            ? 'var(--text-success)'
                            : item.approval_status === 'rejected'
                            ? 'var(--text-error)'
                            : 'var(--gold)',
                      }}
                    >
                      {item.approval_status === 'approved' ? 'Approved' : item.approval_status === 'rejected' ? 'Rejected' : 'Pending approval'}
                    </span>
                    {item.visible_to_client && <> · Shared with client</>}
                  </div>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
