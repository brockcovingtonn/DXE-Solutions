'use client';

import { useState, useEffect } from 'react';
import { getStoredTheme, setStoredTheme } from '@/lib/theme';

const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function handleSelect(value) {
    setTheme(value);
    setStoredTheme(value);
    // Simplest way to guarantee every shell/page picks up the new
    // value consistently — this preference changes rarely.
    window.location.reload();
  }

  return (
    <div style={{ display: 'inline-flex', border: '1px solid rgba(var(--border-rgb),0.2)' }}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleSelect(opt.value)}
          style={{
            border: 'none',
            padding: '0.5rem 1.1rem',
            fontSize: '0.8rem',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            background: theme === opt.value ? '#3E5468' : 'transparent',
            color: theme === opt.value ? '#fff' : 'var(--navy)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
