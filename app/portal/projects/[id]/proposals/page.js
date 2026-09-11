import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import DownloadLink from '@/components/DownloadLink';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function ClientProposalsPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');
  if (!project) notFound();

  // RLS already limits clients to their own project's non-draft
  // proposals; admins/employees previewing see everything on the
  // project.
  const { data: proposals } = await supabase
    .from('proposals')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Proposals</h1>
        <p>{project.name} · Scope of work and pricing from DXE Solutions</p>
      </div>

      <div className={styles.fullWidthCard}>
        {!proposals || proposals.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No proposals have been shared on this project yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {proposals.map((proposal) => (
              <DownloadLink
                key={proposal.id}
                href={proposal.pdf_path ? `/api/proposals/${proposal.id}/download` : undefined}
                target={proposal.pdf_path ? '_blank' : undefined}
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.9rem 1rem',
                  border: '1px solid rgba(var(--border-rgb),0.1)',
                  color: 'inherit',
                  textDecoration: 'none',
                  flexWrap: 'wrap',
                  cursor: proposal.pdf_path ? 'pointer' : 'default',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(62,84,104,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="ti ti-file-description" style={{ color: 'var(--navy)' }} aria-hidden="true"></i>
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--navy)' }}>{proposal.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                    {proposal.status === 'sent' ? `Sent ${formatDate(proposal.sent_at)}` : `Shared ${formatDate(proposal.finalized_at)}`}
                    {proposal.valid_until ? ` · Valid until ${formatDate(proposal.valid_until)}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>{formatCurrency(proposal.total)}</div>
                {proposal.pdf_path && (
                  <i className="ti ti-external-link" style={{ color: 'var(--gold)', flexShrink: 0 }} aria-hidden="true"></i>
                )}
              </DownloadLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
