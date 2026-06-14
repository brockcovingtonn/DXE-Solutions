'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';

export default function AdminNotes({ projectId, initialNotes }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;

    setPosting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, text: body }),
      });

      if (!res.ok) throw new Error();

      setBody('');
      router.refresh();
    } catch {
      setError('Could not post note. Please try again.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      <div className={styles.notesArea}>
        {initialNotes.map((n) => (
          <div
            className={`${styles.noteItem} ${n.author_role === 'client' ? styles.clientNote : ''}`}
            key={n.id}
          >
            <div className={styles.noteFrom}>{n.author_name}</div>
            <div className={styles.noteText}>{n.body}</div>
            <div className={styles.noteTime}>{formatDate(n.created_at)}</div>
          </div>
        ))}
        {initialNotes.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>No notes yet.</p>
        )}
      </div>

      <form className={styles.noteForm} onSubmit={handleSubmit}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Post an update</h3>
        <textarea
          placeholder="Write an update for the client..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={posting}
        />
        {error && <p className={adminStyles.formMsgError}>{error}</p>}
        <button type="submit" className="btn-navy" disabled={posting || !body.trim()}>
          {posting ? 'Posting...' : 'Post update'}
        </button>
      </form>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
