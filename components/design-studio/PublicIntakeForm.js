'use client';

import { useEffect, useState } from 'react';
import IntakeForm from './IntakeForm';
import { C, S } from '@/lib/design-studio/brand';

export default function PublicIntakeForm({ token }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/intake/${token}`)
      .then((r) => r.json())
      .then((data) => setQuote(data.quote || null))
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubmit(answers) {
    const res = await fetch(`/api/intake/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: answers }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Could not submit the form.');
    }
  }

  if (loading) return <div style={{ ...S.small, padding: 24 }}>Loading…</div>;
  if (!quote) return <div style={{ ...S.small, padding: 24 }}>This link is no longer valid.</div>;

  return (
    <div style={S.card}>
      <div style={{ ...S.small, color: C.muted, marginBottom: 4 }}>{quote.quote_number}</div>
      <h1 style={{ ...S.h1, fontSize: 22, marginBottom: 6 }}>Tell us about your project</h1>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 22 }}>
        A few details to help us design {quote.client_name ? `for ${quote.client_name}` : 'your space'}.
      </p>
      <IntakeForm initialAnswers={quote.intake} onSubmit={onSubmit} mode="public" submittedAt={quote.intake_submitted_at} />
    </div>
  );
}
