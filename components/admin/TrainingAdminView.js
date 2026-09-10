'use client';

import { useState } from 'react';
import TrainingAdminTabs from '@/components/admin/TrainingAdminTabs';
import TrainingQuizTabs from '@/components/admin/TrainingQuizTabs';
import CourseProgressTable from '@/components/admin/CourseProgressTable';

const VIEWS = [
  { key: 'steps', label: 'Steps' },
  { key: 'quizzes', label: 'Course Quizzes' },
  { key: 'progress', label: 'Employee Progress' },
];

export default function TrainingAdminView({ stepsByCategory, questionsByCategory, employees, modules, progressByEmployee }) {
  const [view, setView] = useState('steps');

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(var(--border-rgb),0.12)' }}>
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              borderBottom: view === v.key ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom: '-1px',
              color: view === v.key ? 'var(--navy)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'steps' && <TrainingAdminTabs stepsByCategory={stepsByCategory} />}
      {view === 'quizzes' && <TrainingQuizTabs questionsByCategory={questionsByCategory} />}
      {view === 'progress' && (
        <CourseProgressTable employees={employees} modules={modules} progressByEmployee={progressByEmployee} />
      )}
    </div>
  );
}
