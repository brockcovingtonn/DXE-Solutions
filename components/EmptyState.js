export default function EmptyState({ icon = 'ti-inbox', title, subtitle, action, compact }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: compact ? '1.5rem 1rem' : '2.75rem 1rem',
        color: '#a0aec0',
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: compact ? '1.6rem' : '2.2rem', color: '#cbd5e0' }} aria-hidden="true"></i>
      <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#718096', marginTop: '0.65rem', marginBottom: 0 }}>{title}</p>
      {subtitle && <p style={{ fontSize: '0.78rem', marginTop: '0.3rem', marginBottom: 0 }}>{subtitle}</p>}
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
}
