import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin as designStudioAdmin } from '@/lib/design-studio/server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentsList from '@/components/DocumentsList';
import ViewEditSection from '@/components/ViewEditSection';

const DS_STATUS_STYLE = {
  draft: { background: 'rgba(201,168,87,0.15)', color: '#7a5c0a' },
  sent: { background: 'rgba(62,84,104,0.12)', color: 'var(--navy)' },
  accepted: { background: 'rgba(16,185,129,0.12)', color: 'var(--text-success)' },
  declined: { background: 'rgba(148,163,184,0.15)', color: 'var(--text-tertiary)' },
  expired: { background: 'rgba(148,163,184,0.15)', color: 'var(--text-tertiary)' },
};

export default async function DocumentsPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  const [{ data: docs }, { data: profile }] = await Promise.all([
    supabase
      .from('documents')
      .select('*, document_signatures(signer_name, created_at)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
  ]);

  const currentUserName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

  // Design Studio tables are RLS-enabled with no policies by design
  // (service-role + app-layer staff checks only) — same reason the admin
  // project page uses designStudioAdmin() instead of the RLS-scoped
  // client. A draft quote isn't ready for the client to see, so it's
  // excluded here; everything else links to its public share-token
  // view (`/proposal/[token]`, the same page used for e-signing) since
  // the staff-only `/design-studio/{id}` editor isn't reachable by a client.
  const { data: designStudioQuotes } = await designStudioAdmin()
    .from('design_studio_quotes')
    .select('id, quote_number, status, total, share_token, created_at')
    .eq('project_id', projectId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Documents</h1>
        <p>
          {project.name} · {docs?.length || 0} files on record
        </p>
      </div>

      <ViewEditSection
        title="All Project Documents"
        actionLabel="Add"
        edit={<DocumentUpload projectId={projectId} bare />}
        view={<DocumentsList docs={docs} currentUserName={currentUserName} />}
      />

      {designStudioQuotes && designStudioQuotes.length > 0 && (
        <div className={styles.fullWidthCard}>
          <h3>Design Proposals</h3>
          {designStudioQuotes.map((q) => (
            <Link
              key={q.id}
              href={`/proposal/${q.share_token}`}
              className={adminStyles.listRow}
              style={{ textDecoration: 'none' }}
            >
              <span className={adminStyles.listRowPill} style={DS_STATUS_STYLE[q.status] || DS_STATUS_STYLE.draft}>
                {q.status}
              </span>
              <div className={adminStyles.listRowMain}>
                <div className={adminStyles.listRowTitle}>{q.quote_number}</div>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(q.total || 0)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
