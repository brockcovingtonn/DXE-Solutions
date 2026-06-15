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

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [busyId, setBusyId] = useState(null);

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

  function startEdit(note) {
    setEditingId(note.id);
    setEditText(note.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function saveEdit(noteId) {
    if (!editText.trim()) return;

    setBusyId(noteId);
    try {
      const res = await fetch(`/api/admin/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText }),
      });

      if (!res.ok) throw new Error();

      setEditingId(null);
      router.refresh();
    } catch {
      setError('Could not save changes.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(noteId) {
    if (!confirm('Delete this note? This cannot be undone.')) return;

    setBusyId(noteId);
    try {
      const res = await fetch(`/api/admin/notes/${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError('Could not delete note.');
    } finally {
      setBusyId(null);
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
            <div className={adminStyles.noteHeaderRow}>
              <div className={styles.noteFrom}>{n.author_name}</div>
              {editingId !== n.id && (
                <div className={adminStyles.utilityEntryActions}>
                  <button
                    type="button"
                    className={adminStyles.iconBtn}
                    onClick={() => startEdit(n)}
                    disabled={busyId === n.id}
                    aria-label="Edit note"
                  >
                    <i className="ti ti-pencil" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    className={adminStyles.iconBtn}
                    onClick={() => handleDelete(n.id)}
                    disabled={busyId === n.id}
                    aria-label="Delete note"
                  >
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </button>
                </div>
              )}
            </div>

            {editingId === n.id ? (
              <div>
                <textarea
                  className={adminStyles.fieldTextarea}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <div className={adminStyles.entryFormActions}>
                  <button
                    type="button"
                    className="btn-navy"
                    onClick={() => saveEdit(n.id)}
                    disabled={busyId === n.id || !editText.trim()}
                  >
                    {busyId === n.id ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className={adminStyles.cancelBtn} onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.noteText}>{n.body}</div>
                <div className={styles.noteTime}>{formatDate(n.created_at)}</div>
              </>
            )}
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
