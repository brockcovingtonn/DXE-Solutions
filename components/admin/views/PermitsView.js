import { PERMIT_STATUSES } from '@/lib/constants';
import { ViewEmpty } from './ViewField';

export default function PermitsView({ permits }) {
  if (!permits || permits.length === 0) {
    return <ViewEmpty>No permits added yet.</ViewEmpty>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {permits.map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--navy)', fontWeight: 500 }}>{p.permit_type}</span>
          {p.permit_number && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>#{p.permit_number}</span>}
          {p.agency && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>{p.agency}</span>}
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginLeft: 'auto' }}>
            {PERMIT_STATUSES.find((s) => s.value === p.status)?.label || p.status}
          </span>
        </div>
      ))}
    </div>
  );
}
