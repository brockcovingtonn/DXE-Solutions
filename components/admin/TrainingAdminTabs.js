'use client';

import { useState } from 'react';
import { TRAINING_CATEGORIES } from '@/lib/constants';
import TrainingStepsEditor from '@/components/admin/TrainingStepsEditor';

export default function TrainingAdminTabs({ stepsByCategory }) {
  const [active, setActive] = useState(TRAINING_CATEGORIES[0]);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {TRAINING_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
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
            <span style={{ marginLeft: '0.4rem', opacity: 0.7 }}>
              ({(stepsByCategory[cat] || []).length})
            </span>
          </button>
        ))}
      </div>

      <TrainingStepsEditor category={active} initialSteps={stepsByCategory[active] || []} />
    </div>
  );
}
