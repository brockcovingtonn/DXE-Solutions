'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarRating from '@/components/StarRating';

const GOOGLE_PLACE_ID = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID;
const GOOGLE_REVIEW_URL = GOOGLE_PLACE_ID
  ? `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`
  : null;

export default function ReviewForm({ projectId, initialReview }) {
  const router = useRouter();
  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [body, setBody] = useState(initialReview?.body || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const showGoogleCta = GOOGLE_REVIEW_URL && rating >= 4 && (justSaved || !!initialReview);

  const labelStyle = {
    display: 'block',
    fontSize: '0.72rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
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
      setJustSaved(true);
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
      setJustSaved(false);
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
            border: '1px solid rgba(var(--border-rgb),0.2)',
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
        <p style={{ fontSize: '0.82rem', color: message.startsWith('Thank') ? 'var(--text-success)' : 'var(--text-error)', marginBottom: '1rem' }}>
          {message}
        </p>
      )}

      {showGoogleCta && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'var(--surface)',
            border: '1px solid rgba(var(--border-rgb),0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--navy)', margin: 0 }}>
            Glad you enjoyed working with us — mind sharing this on Google too?
          </p>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-navy"
            style={{ whiteSpace: 'nowrap' }}
          >
            Leave a Google Review
          </a>
        </div>
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
            style={{ background: 'none', border: 'none', color: 'var(--text-error)', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
          >
            {deleting ? 'Removing...' : 'Remove my review'}
          </button>
        )}
      </div>
    </form>
  );
}
