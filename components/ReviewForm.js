'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarRating from '@/components/StarRating';

export default function ReviewForm({ projectId, initialReview }) {
  const router = useRouter();
  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [body, setBody] = useState(initialReview?.body || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  const labelStyle = {
    display: 'block',
    fontSize: '0.72rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#718096',
    marginBottom: '0.6rem',
    fontWeight: 500,
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating) {
      setMessage('Please select a star rating.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const res = initialReview
        ? await fetch(`/api/reviews/${initialReview.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, body }),
          })
        : await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, rating, body }),
          });

      if (!res.ok) throw new Error();

      setMessage('Thank you — your review has been saved.');
      router.refresh();
    } catch {
      setMessage('Could not save your review. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialReview) return;
    if (!confirm('Remove your review? This cannot be undone.')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews/${initialReview.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setRating(0);
      setBody('');
      router.refresh();
    } catch {
      setMessage('Could not remove your review.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>Your Rating</label>
        <StarRating value={rating} onChange={setRating} size={30} />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>Your Review (optional)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell us about your experience working with DXE Solutions..."
          style={{
            width: '100%',
            minHeight: '130px',
            border: '1px solid rgba(62,84,104,0.2)',
            background: 'var(--cream)',
            color: 'var(--navy)',
            padding: '0.75rem',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.88rem',
            outline: 'none',
            resize: 'vertical',
          }}
        />
      </div>

      {message && (
        <p style={{ fontSize: '0.82rem', color: message.startsWith('Thank') ? '#065f46' : '#dc2626', marginBottom: '1rem' }}>
          {message}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <button type="submit" className="btn-navy" disabled={saving}>
          {saving ? 'Saving...' : initialReview ? 'Update Review' : 'Submit Review'}
        </button>
        {initialReview && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
          >
            {deleting ? 'Removing...' : 'Remove my review'}
          </button>
        )}
      </div>
    </form>
  );
}
