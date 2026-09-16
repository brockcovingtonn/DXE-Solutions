'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import IntakeForm from './IntakeForm';
import { intakeSummaryHtml } from '@/lib/design-studio/intake';
import { C, S } from '@/lib/design-studio/brand';

// Staff-facing view of a quote's intake answers — read-only summary of
// whatever the client (or a staff member) has filled in, with an "Edit"
// toggle so staff can fill it out themselves (e.g. over the phone).
export default function IntakeSection({ quoteId, intake, submittedAt }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const hasAnswers = intake && Object.values(intake).some((v) => (Array.isArray(v) ? v.length : v));

  async function save(answers) {
    const res = await fetch(`/api/design-studio/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: answers }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save the intake form.');
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <>
        <IntakeForm initialAnswers={intake} onSubmit={save} mode="staff" />
        <button
          type="button"
          onClick={() => setEditing(false)}
          style={{ ...S.small, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 10 }}
        >
          Cancel
        </button>
      </>
    );
  }

  return (
    <div>
      {hasAnswers ? (
        <>
          {submittedAt ? (
            <div style={{ ...S.small, marginBottom: 10 }}>Received {new Date(submittedAt).toLocaleDateString()}</div>
          ) : null}
          <div
            style={{ fontSize: 13, color: C.inkSoft }}
            dangerouslySetInnerHTML={{ __html: intakeSummaryHtml(intake) }}
          />
        </>
      ) : (
        <div style={{ ...S.small, marginBottom: 10 }}>No intake answers yet.</div>
      )}
      <button type="button" onClick={() => setEditing(true)} style={{ ...S.btnGhost, marginTop: 12 }}>
        {hasAnswers ? 'Edit intake answers' : 'Fill out intake form'}
      </button>
    </div>
  );
}
