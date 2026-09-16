'use client';

import { useState } from 'react';
import { INTAKE_FIELDS, EMPTY_INTAKE } from '@/lib/design-studio/intake';
import { C, S } from '@/lib/design-studio/brand';

// Renders the shared intake field schema. Used both on the public
// /intake/[token] page (client fills it out, no login) and inside the
// staff quote detail view (mode="staff", staff fills/edits it directly).
export default function IntakeForm({ initialAnswers, onSubmit, mode = 'public', submittedAt }) {
  const [answers, setAnswers] = useState({ ...EMPTY_INTAKE, ...(initialAnswers || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function setField(id, value) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  function toggleMulti(id, option) {
    setAnswers((a) => {
      const current = Array.isArray(a[id]) ? a[id] : [];
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
      return { ...a, [id]: next };
    });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(answers);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not save the intake form.');
    } finally {
      setSaving(false);
    }
  }

  if (done && mode === 'public') {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: '40px 24px' }}>
        <h2 style={S.h2}>Thanks — we've got it</h2>
        <p style={{ color: C.muted, fontSize: 14 }}>
          We'll review your answers and follow up shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      {mode === 'public' && submittedAt ? (
        <div style={{ ...S.small, marginBottom: 14, color: C.muted }}>
          You submitted this on {new Date(submittedAt).toLocaleDateString()}. Submitting again will update your answers.
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {INTAKE_FIELDS.map((field) => (
          <div key={field.id}>
            <label style={S.label}>{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                style={{ ...S.input, minHeight: 72, resize: 'vertical', fontFamily: 'inherit' }}
                value={answers[field.id] || ''}
                onChange={(e) => setField(field.id, e.target.value)}
              />
            ) : field.type === 'select' ? (
              <select style={S.input} value={answers[field.id] || ''} onChange={(e) => setField(field.id, e.target.value)}>
                <option value="">Select…</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'multiselect' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {field.options.map((opt) => {
                  const selected = (answers[field.id] || []).includes(opt);
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => toggleMulti(field.id, opt)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 20,
                        border: `1px solid ${selected ? C.clay : C.line}`,
                        background: selected ? C.clay : C.paper,
                        color: selected ? '#fff' : C.ink,
                        fontSize: 12.5,
                        cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input style={S.input} value={answers[field.id] || ''} onChange={(e) => setField(field.id, e.target.value)} />
            )}
          </div>
        ))}
      </div>

      {error ? <div style={{ marginTop: 14, fontSize: 13, color: C.warn }}>{error}</div> : null}

      <button type="submit" disabled={saving} style={{ ...S.btn, marginTop: 20 }}>
        {saving ? 'Saving…' : mode === 'public' ? 'Submit' : 'Save intake answers'}
      </button>
    </form>
  );
}
