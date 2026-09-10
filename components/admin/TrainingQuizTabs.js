'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRAINING_CATEGORIES } from '@/lib/constants';
import adminStyles from '@/components/admin.module.css';

const blankQ = { question: '', options: ['', '', '', ''], correct_index: 0 };

function QuestionForm({ value, onChange }) {
  return (
    <div className={adminStyles.rosterForm}>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Question</label>
        <textarea
          className={adminStyles.fieldTextarea}
          value={value.question}
          onChange={(e) => onChange({ ...value, question: e.target.value })}
        />
      </div>
      <label className={adminStyles.fieldLabel}>Answer options (select the correct one)</label>
      {value.options.map((opt, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <input
            type="radio"
            name="correct-option"
            checked={value.correct_index === i}
            onChange={() => onChange({ ...value, correct_index: i })}
            style={{ accentColor: 'var(--gold)' }}
          />
          <input
            className={adminStyles.fieldInput}
            value={opt}
            placeholder={`Option ${i + 1}`}
            onChange={(e) => {
              const options = [...value.options];
              options[i] = e.target.value;
              onChange({ ...value, options });
            }}
          />
          {value.options.length > 2 && (
            <button
              type="button"
              className={adminStyles.iconBtn}
              onClick={() => {
                const options = value.options.filter((_, idx) => idx !== i);
                onChange({ ...value, options, correct_index: Math.min(value.correct_index, options.length - 1) });
              }}
              aria-label="Remove option"
            >
              <i className="ti ti-x" aria-hidden="true"></i>
            </button>
          )}
        </div>
      ))}
      {value.options.length < 5 && (
        <button
          type="button"
          className={adminStyles.addRowBtn}
          onClick={() => onChange({ ...value, options: [...value.options, ''] })}
        >
          <i className="ti ti-plus" aria-hidden="true"></i> Add option
        </button>
      )}
    </div>
  );
}

export default function TrainingQuizTabs({ questionsByCategory }) {
  const router = useRouter();
  const [active, setActive] = useState(TRAINING_CATEGORIES[0]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(blankQ);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(blankQ);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const questions = questionsByCategory[active] || [];

  async function create() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/training/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, category: active, sort_order: questions.length + 1 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not save.'); return; }
      setAdding(false);
      setDraft(blankQ);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/training/quiz/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not save.'); return; }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this quiz question?')) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/training/quiz/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {TRAINING_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => { setActive(cat); setAdding(false); setEditingId(null); }}
            style={{
              padding: '0.5rem 0.9rem',
              fontSize: '0.78rem',
              fontWeight: 500,
              border: '1px solid rgba(var(--border-rgb),0.15)',
              background: active === cat ? 'var(--navy)' : 'transparent',
              color: active === cat ? 'var(--white)' : 'var(--navy)',
              cursor: 'pointer',
            }}
          >
            {cat}
            <span style={{ marginLeft: '0.4rem', opacity: 0.7 }}>({(questionsByCategory[cat] || []).length})</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {questions.map((q, qi) =>
          editingId === q.id ? (
            <div key={q.id}>
              <QuestionForm value={editDraft} onChange={setEditDraft} />
              <div className={adminStyles.entryFormActions}>
                <button type="button" className="btn-navy" onClick={() => saveEdit(q.id)} disabled={busy}>Save</button>
                <button type="button" className={adminStyles.cancelBtn} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div key={q.id} style={{ border: '1px solid rgba(var(--border-rgb),0.12)', borderRadius: '6px', padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--navy)' }}>{qi + 1}. {q.question}</div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button type="button" className={adminStyles.iconBtn} aria-label="Edit"
                    onClick={() => { setEditingId(q.id); setEditDraft({ question: q.question, options: [...q.options], correct_index: q.correct_index }); }}>
                    <i className="ti ti-pencil" aria-hidden="true"></i>
                  </button>
                  <button type="button" className={adminStyles.iconBtn} aria-label="Delete" onClick={() => remove(q.id)}>
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {q.options.map((opt, oi) => (
                  <li key={oi} style={{ color: oi === q.correct_index ? 'var(--text-success)' : undefined, fontWeight: oi === q.correct_index ? 600 : 400 }}>
                    {opt}{oi === q.correct_index ? '  ✓' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
        {questions.length === 0 && !adding && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No quiz questions for this section yet.</p>
        )}
      </div>

      {error && <p className={adminStyles.formMsgError} style={{ marginTop: '0.75rem' }}>{error}</p>}

      {adding ? (
        <div style={{ marginTop: '0.75rem' }}>
          <QuestionForm value={draft} onChange={setDraft} />
          <div className={adminStyles.entryFormActions}>
            <button type="button" className="btn-navy" onClick={create} disabled={busy || !draft.question.trim()}>Add question</button>
            <button type="button" className={adminStyles.cancelBtn} onClick={() => { setAdding(false); setDraft(blankQ); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className={adminStyles.addRowBtn} onClick={() => setAdding(true)} style={{ marginTop: '0.75rem' }}>
          <i className="ti ti-plus" aria-hidden="true"></i> Add quiz question
        </button>
      )}
    </div>
  );
}
