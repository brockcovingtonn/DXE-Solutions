'use client';

export default function StarRating({ value = 0, onChange, size = 20, readOnly = false }) {
  return (
    <div style={{ display: 'inline-flex', gap: '0.2rem' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i
          key={n}
          className={`ti ${n <= value ? 'ti-star-filled' : 'ti-star'}`}
          onClick={readOnly ? undefined : () => onChange(n)}
          aria-hidden="true"
          style={{
            fontSize: `${size}px`,
            color: n <= value ? 'var(--gold)' : '#cbd5e0',
            cursor: readOnly ? 'default' : 'pointer',
            lineHeight: 1,
          }}
        ></i>
      ))}
    </div>
  );
}
