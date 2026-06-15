import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import NewNoteForm from '@/components/NewNoteForm';

export default async function NotesPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Notes &amp; Updates</h1>
        <p>Messages and updates from your project manager</p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Project Notes</h3>
        <div className={styles.notesArea}>
          {(notes || []).map((n) => (
            <div
              className={`${styles.noteItem} ${n.author_role === 'client' ? styles.clientNote : ''}`}
              key={n.id}
            >
              <div className={styles.noteFrom}>{n.author_name}</div>
              <div className={styles.noteText}>{n.body}</div>
              <div className={styles.noteTime}>{formatDate(n.created_at)}</div>
            </div>
          ))}
          {(!notes || notes.length === 0) && (
            <p style={{ fontSize: '0.85rem', color: '#718096' }}>No notes yet.</p>
          )}
        </div>

        <NewNoteForm projectId={projectId} />
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
