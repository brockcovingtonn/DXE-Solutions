import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default async function AccountingPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const balanceDue = (invoices || [])
    .filter((i) => i.kind === 'invoice' && i.status === 'unpaid')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Accounting</h1>
        <p>{project.name} · Invoices and receipts</p>
      </div>

      <div className={styles.fullWidthCard}>
        <div
          style={{
            padding: '1.25rem',
            background: balanceDue > 0 ? '#fef2f2' : 'var(--surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#718096', fontWeight: 600 }}>
              Balance Due
            </div>
            <div style={{ fontSize: '0.78rem', color: '#a0aec0', marginTop: '0.15rem' }}>
              {balanceDue > 0 ? 'Payable to DXE Solutions' : 'You’re all caught up'}
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: balanceDue > 0 ? '#b91c1c' : '#065f46' }}>
            {formatCurrency(balanceDue)}
          </div>
        </div>

        {!invoices || invoices.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>No invoices or receipts on file yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {invoices.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  border: '1px solid rgba(62,84,104,0.1)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.5rem',
                    background: item.kind === 'receipt' ? 'rgba(59,130,246,0.12)' : 'rgba(201,168,87,0.18)',
                    color: item.kind === 'receipt' ? '#1e40af' : '#7a5c0a',
                    flexShrink: 0,
                  }}
                >
                  {item.kind}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--navy)', fontWeight: 500 }}>{item.description}</div>
                  <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '0.15rem' }}>
                    {item.due_date ? `Due ${item.due_date}` : item.paid_date ? `Paid ${item.paid_date}` : '—'}
                    {item.status === 'unpaid' && ' · Unpaid'}
                    {item.file_name && (
                      <>
                        {' · '}
                        <a href={`/api/invoices/${item.id}/download`} style={{ color: 'var(--gold)' }}>
                          {item.file_name}
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
                  {formatCurrency(item.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
