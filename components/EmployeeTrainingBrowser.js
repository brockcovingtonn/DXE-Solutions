'use client';

import { useState } from 'react';
import { TRAINING_CATEGORIES } from '@/lib/constants';

export default function EmployeeTrainingBrowser({ stepsByCategory }) {
  const [active, setActive] = useState(TRAINING_CATEGORIES[0]);
  const steps = stepsByCategory[active] || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {TRAINING_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            style={{
              textAlign: 'left',
              padding: '0.6rem 0.75rem',
              fontSize: '0.82rem',
              fontWeight: active === cat ? 600 : 400,
              border: 'none',
              borderLeft: active === cat ? '3px solid var(--gold)' : '3px solid transparent',
              background: active === cat ? 'var(--surface)' : 'transparent',
              color: 'var(--navy)',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div>
        <h3 style={{ marginBottom: '1.25rem' }}>{active}</h3>
        {steps.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No training steps in this category yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {steps.map((step, i) => (
              <div key={step.id} style={{ display: 'flex', gap: '1rem' }}>
                <div
                  style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '1.3rem',
                    fontWeight: 600,
                    color: 'var(--gold-light)',
                    flexShrink: 0,
                    width: '2rem',
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--navy)' }}>{step.title}</div>
                  {step.description && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.7 }}>
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
