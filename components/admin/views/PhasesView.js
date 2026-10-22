import { PHASE_STATES } from '@/lib/constants';
import { ViewEmpty } from './ViewField';

const SEGMENTS = 10;

function PhaseSegments({ pct }) {
  const filled = Math.round((Math.max(0, Math.min(100, pct ?? 0)) / 100) * SEGMENTS);
  return (
    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <span
          key={i}
          style={{
            width: '9px',
            height: '9px',
            borderRadius: '2px',
            background: i < filled ? 'var(--gold)' : 'rgba(var(--border-rgb),0.15)',
          }}
        />
      ))}
    </div>
  );
}

export default function PhasesView({ phases }) {
  if (!phases || phases.length === 0) {
    return <ViewEmpty>No phases added yet.</ViewEmpty>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {phases.map((phase, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--navy)', flex: 1 }}>{phase.name || '—'}</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
            {PHASE_STATES.find((s) => s.value === phase.state)?.label || phase.state}
          </span>
          {phase.state !== 'na' && (
            <>
              <PhaseSegments pct={phase.pct} />
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', width: '2.5rem', textAlign: 'right' }}>{phase.pct ?? 0}%</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
