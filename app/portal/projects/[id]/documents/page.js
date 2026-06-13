import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import DocumentUpload from '@/components/DocumentUpload';

export default async function DocumentsPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .single();

  if (!project) notFound();

  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const BADGE_CLASS = {
    new: styles.badgeNew,
    signed: styles.badgeSigned,
    pending: styles.badgePending,
  };

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Documents</h1>
        <p>
          {project.name} · {docs?.length || 0} files on record
        </p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>All Project Documents</h3>
        <div className={styles.docList}>
          {(docs || []).map((d) => (
            <div className={styles.docItem} key={d.id}>
              <div className={styles.docIcon}>
                <i className="ti ti-file-text" aria-hidden="true"></i>
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.docName}>{d.file_name}</div>
                <div className={styles.docMeta}>
                  {formatDate(d.created_at)} · Uploaded by{' '}
                  {d.uploaded_by_role === 'dxe' ? 'DXE' : 'You'}
                </div>
              </div>
              <span className={`${styles.docBadge} ${BADGE_CLASS[d.badge] || ''}`}>{d.badge}</span>
              <a
                href={`/api/documents/${d.id}/download`}
                style={{ color: '#718096', fontSize: '1rem', marginLeft: '0.75rem', cursor: 'pointer' }}
                title="Download"
              >
                <i className="ti ti-download" aria-hidden="true"></i>
              </a>
            </div>
          ))}
          {(!docs || docs.length === 0) && (
            <p style={{ fontSize: '0.85rem', color: '#718096' }}>No documents yet.</p>
          )}
        </div>
      </div>

      <DocumentUpload projectId={projectId} />
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
