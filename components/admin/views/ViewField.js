export default function ViewField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: '0.15rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>{value || '—'}</div>
    </div>
  );
}

export function ViewFieldGrid({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
      {children}
    </div>
  );
}

export function ViewEmpty({ children }) {
  return <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{children}</p>;
}
