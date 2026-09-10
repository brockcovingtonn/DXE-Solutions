'use client';

import { useState } from 'react';
import { isModuleUnlocked, courseCompletion } from '@/lib/training-course';

const PASS_MARK = 80;

export default function TrainingCourse({ modules, stepsByCategory, quizzesByCategory, initialProgress, resumeIndex }) {
  const [progress, setProgress] = useState(initialProgress || {});
  const [openIndex, setOpenIndex] = useState(resumeIndex ?? 0);
  const [answers, setAnswers] = useState({}); // { [category]: { [questionId]: optionIndex } }
  const [result, setResult] = useState({}); // { [category]: gradeResponse }
  const [busy, setBusy] = useState(false);
  const [retaking, setRetaking] = useState({}); // { [category]: true }

  const completion = courseCompletion(modules, progress);

  function setAnswer(category, questionId, optionIndex) {
    setAnswers((a) => ({ ...a, [category]: { ...(a[category] || {}), [questionId]: optionIndex } }));
  }

  async function markReviewed(category) {
    setBusy(true);
    try {
      const res = await fetch('/api/employee/course/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        setProgress((p) => ({ ...p, [category]: { ...(p[category] || {}), reviewed: true } }));
      }
    } finally {
      setBusy(false);
    }
  }

  function resetQuiz(category) {
    setResult((r) => ({ ...r, [category]: undefined }));
    setAnswers((a) => ({ ...a, [category]: {} }));
  }

  async function submitQuiz(category) {
    const quiz = quizzesByCategory[category] || [];
    const given = answers[category] || {};
    const ordered = quiz.map((q) => (typeof given[q.id] === 'number' ? given[q.id] : -1));
    setBusy(true);
    try {
      const res = await fetch('/api/employee/course/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, answers: ordered }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult((r) => ({ ...r, [category]: { error: data.error || 'Could not submit.' } }));
        return;
      }
      setResult((r) => ({ ...r, [category]: data }));
      setRetaking((rt) => ({ ...rt, [category]: false }));
      setProgress((p) => ({
        ...p,
        [category]: {
          ...(p[category] || {}),
          reviewed: true,
          passed: (p[category]?.passed) || data.passed,
          best_score: Math.max(p[category]?.best_score ?? 0, data.score),
        },
      }));
      if (data.passed) {
        const idx = modules.indexOf(category);
        if (idx >= 0 && idx + 1 < modules.length) {
          setTimeout(() => setOpenIndex(idx + 1), 600);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Overall progress */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          <span style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Course progress</span>
          <span>
            {completion.passed} / {completion.total} sections passed
          </span>
        </div>
        <div style={{ height: '8px', background: 'rgba(var(--border-rgb),0.15)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${completion.pct}%`, height: '100%', background: 'var(--gold)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {modules.map((category, i) => {
          const unlocked = isModuleUnlocked(i, modules, progress);
          const mp = progress[category] || {};
          const steps = stepsByCategory[category] || [];
          const quiz = quizzesByCategory[category] || [];
          const isOpen = openIndex === i && unlocked;
          const res = result[category];
          const showQuiz = mp.reviewed && (!mp.passed || retaking[category]);

          let statusLabel = 'Not started';
          let statusColor = 'var(--text-tertiary)';
          if (!unlocked) { statusLabel = 'Locked'; statusColor = 'var(--text-tertiary)'; }
          else if (mp.passed) { statusLabel = `Passed · ${mp.best_score}%`; statusColor = 'var(--text-success)'; }
          else if (mp.reviewed) { statusLabel = 'Quiz ready'; statusColor = 'var(--gold)'; }

          return (
            <div
              key={category}
              style={{
                border: '1px solid rgba(var(--border-rgb),0.14)',
                borderRadius: '8px',
                background: unlocked ? 'var(--surface, #fff)' : 'rgba(var(--border-rgb),0.03)',
                opacity: unlocked ? 1 : 0.7,
              }}
            >
              <button
                type="button"
                onClick={() => unlocked && setOpenIndex(isOpen ? -1 : i)}
                disabled={!unlocked}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.9rem 1.1rem',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: mp.passed ? 'var(--text-success)' : unlocked ? 'var(--navy)' : 'rgba(var(--border-rgb),0.25)',
                    color: '#fff',
                  }}
                >
                  {mp.passed ? <i className="ti ti-check" aria-hidden="true" /> : !unlocked ? <i className="ti ti-lock" aria-hidden="true" /> : i + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--navy)' }}>{category}</span>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' }}>
                    {steps.length} section{steps.length === 1 ? '' : 's'}
                    {quiz.length > 0 && ` · ${quiz.length}-question quiz`}
                    {!unlocked && i > 0 && ` · complete "${modules[i - 1]}" to unlock`}
                  </span>
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColor, flexShrink: 0 }}>{statusLabel}</span>
                {unlocked && (
                  <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                )}
              </button>

              {isOpen && (
                <div style={{ padding: '0 1.1rem 1.25rem', borderTop: '1px solid rgba(var(--border-rgb),0.1)' }}>
                  {/* Section content */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', margin: '1.1rem 0' }}>
                    {steps.map((step, si) => (
                      <div key={step.id} style={{ display: 'flex', gap: '0.9rem' }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600, color: 'var(--gold-light)', width: '1.6rem', flexShrink: 0 }}>
                          {si + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--navy)' }}>{step.title}</div>
                          {step.description && (
                            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                              {step.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reviewed gate */}
                  {!mp.reviewed && (
                    <button type="button" className="btn-navy" onClick={() => markReviewed(category)} disabled={busy} style={{ fontSize: '0.8rem' }}>
                      {busy ? 'Saving…' : quiz.length > 0 ? 'I’ve read this section — start the quiz' : 'Mark section complete'}
                    </button>
                  )}

                  {/* Passed banner */}
                  {mp.passed && !retaking[category] && (
                    <div style={{ padding: '0.85rem 1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '0.85rem', color: '#065f46' }}>
                      <strong>Passed</strong> with a best score of {mp.best_score}%.{' '}
                      {quiz.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { setRetaking((rt) => ({ ...rt, [category]: true })); setResult((r) => ({ ...r, [category]: undefined })); }}
                          style={{ background: 'none', border: 'none', color: '#065f46', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                        >
                          Retake the quiz
                        </button>
                      )}
                    </div>
                  )}

                  {/* Quiz */}
                  {showQuiz && quiz.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', color: 'var(--navy)', margin: '0 0 0.9rem' }}>Section quiz</h4>
                      {quiz.map((question, qi) => {
                        const given = answers[category]?.[question.id];
                        const qResult = res?.results?.find((x) => x.questionId === question.id);
                        return (
                          <fieldset key={question.id} style={{ border: 'none', padding: 0, margin: '0 0 1.1rem' }}>
                            <legend style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.5rem' }}>
                              {qi + 1}. {question.question}
                            </legend>
                            {question.options.map((opt, oi) => {
                              const isCorrect = qResult && qResult.correctIndex === oi;
                              const isWrongPick = qResult && !qResult.correct && given === oi;
                              return (
                                <label
                                  key={oi}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem',
                                    padding: '0.4rem 0.55rem',
                                    fontSize: '0.84rem',
                                    color: 'var(--text-primary)',
                                    borderRadius: '5px',
                                    cursor: qResult ? 'default' : 'pointer',
                                    background: isCorrect ? 'rgba(16,185,129,0.1)' : isWrongPick ? 'rgba(220,38,38,0.08)' : 'transparent',
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`${category}-${question.id}`}
                                    checked={given === oi}
                                    disabled={Boolean(qResult) || busy}
                                    onChange={() => setAnswer(category, question.id, oi)}
                                    style={{ marginTop: '0.15rem', accentColor: 'var(--gold)' }}
                                  />
                                  <span>{opt}</span>
                                  {isCorrect && <i className="ti ti-check" style={{ color: 'var(--text-success)', marginLeft: 'auto' }} aria-hidden="true" />}
                                  {isWrongPick && <i className="ti ti-x" style={{ color: 'var(--text-error)', marginLeft: 'auto' }} aria-hidden="true" />}
                                </label>
                              );
                            })}
                          </fieldset>
                        );
                      })}

                      {res?.error && <p style={{ fontSize: '0.8rem', color: 'var(--text-error)' }}>{res.error}</p>}

                      {res && !res.error && (
                        <div
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            marginBottom: '0.85rem',
                            background: res.passed ? '#ecfdf5' : '#fef2f2',
                            border: `1px solid ${res.passed ? '#a7f3d0' : '#fecaca'}`,
                            color: res.passed ? '#065f46' : '#991b1b',
                          }}
                        >
                          {res.passed ? (
                            <>
                              <strong>Passed — {res.score}%.</strong> {res.correctCount} of {res.total} correct.
                              {modules.indexOf(category) + 1 < modules.length && ' The next section is now unlocked.'}
                            </>
                          ) : (
                            <>
                              <strong>{res.score}% — not quite.</strong> You need {res.passMark}%. Review the section above and try again.
                            </>
                          )}
                        </div>
                      )}

                      {res && !res.passed && !res.error ? (
                        <button type="button" className="btn-navy" onClick={() => resetQuiz(category)} style={{ fontSize: '0.8rem' }}>
                          Try again
                        </button>
                      ) : (!res || res.error) ? (
                        <button
                          type="button"
                          className="btn-navy"
                          onClick={() => submitQuiz(category)}
                          disabled={busy || Object.keys(answers[category] || {}).length < quiz.length}
                          style={{ fontSize: '0.8rem' }}
                        >
                          {busy ? 'Checking…' : 'Submit quiz'}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completion.passed === completion.total && completion.total > 0 && (
        <div style={{ marginTop: '1.5rem', padding: '1.1rem 1.25rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.9rem', textAlign: 'center' }}>
          <strong>Course complete.</strong> You’ve passed every section.
        </div>
      )}
    </div>
  );
}
