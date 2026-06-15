'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/components/portal-shared.module.css';

export default function NewNoteForm({ projectId }) {
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
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, text: body.trim() }),
      });

      if (!res.ok) throw new Error();

      setBody('');
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Could not post your note. Please try again.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <form className={styles.noteForm} onSubmit={handleSubmit}>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Add a note</h3>
      <textarea
        placeholder="Write a message to your project manager..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={posting}
      />
      {error && <p style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: '0.75rem' }}>{error}</p>}
      <button type="submit" className="btn-navy" disabled={posting || !body.trim()}>
        {posting ? 'Posting...' : 'Post Note'}
      </button>
    </form>
  );
}
