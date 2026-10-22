import { UTILITY_TYPES } from '@/lib/constants';

export default function UtilitiesSummaryView({ utilities }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {UTILITY_TYPES.map((type) => {
        const u = (utilities || []).find((x) => x.utility_type === type.value);
        return (
          <div key={type.value} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
            <i
              className={`ti ${u?.enabled ? 'ti-circle-check' : 'ti-circle-dashed'}`}
              aria-hidden="true"
              style={{ color: u?.enabled ? 'var(--text-success, #10b981)' : 'var(--text-tertiary)', flexShrink: 0 }}
            ></i>
            <span style={{ color: 'var(--navy)', flex: 1 }}>{type.label}</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
              {u?.enabled ? u?.contact_name || 'Enabled for client' : 'Off'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
