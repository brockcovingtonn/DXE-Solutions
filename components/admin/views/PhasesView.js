import { PHASE_STATES } from '@/lib/constants';
import { ViewEmpty } from './ViewField';

const DOT_COLOR = { done: 'var(--text-success, #10b981)', active: 'var(--gold)', pending: 'var(--text-tertiary)', na: 'var(--text-tertiary)' };

export default function PhasesView({ phases }) {
  if (!phases || phases.length === 0) {
    return <ViewEmpty>No phases added yet.</ViewEmpty>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {phases.map((phase, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: DOT_COLOR[phase.state] || 'var(--text-tertiary)', flexShrink: 0 }} />
          <span style={{ color: 'var(--navy)', flex: 1 }}>{phase.name || '—'}</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
            {PHASE_STATES.find((s) => s.value === phase.state)?.label || phase.state}
          </span>
          {phase.state !== 'na' && (
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', width: '2.5rem', textAlign: 'right' }}>{phase.pct ?? 0}%</span>
          )}
        </div>
      ))}
    </div>
  );
}
