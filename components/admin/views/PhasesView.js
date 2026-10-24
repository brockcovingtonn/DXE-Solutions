import { ViewEmpty } from './ViewField';
import { phaseColor } from '@/lib/phase-color';

export default function PhasesView({ phases }) {
  if (!phases || phases.length === 0) {
    return <ViewEmpty>No phases added yet.</ViewEmpty>;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '2px',
        background: 'rgba(var(--border-rgb),0.12)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      {phases.map((phase, i) => {
        const isNA = phase.state === 'na';
        const pct = Math.max(0, Math.min(100, phase.pct ?? 0));
        const hasFill = !isNA && pct > 0;
        const isActive = phase.state === 'active';
        return (
          <div
            key={i}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '0.85rem 0.6rem',
              textAlign: 'center',
              background: hasFill ? phaseColor(pct) : 'transparent',
              borderBottom: isActive ? '3px solid var(--navy)' : '3px solid transparent',
            }}
          >
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: hasFill ? 'var(--navy)' : 'var(--text-tertiary)',
                marginBottom: '0.3rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {phase.name || '—'}
            </div>
            <div
              className="display"
              style={{
                fontSize: '1.3rem',
                fontWeight: 600,
                color: hasFill ? 'var(--navy)' : 'var(--text-faint)',
              }}
            >
              {isNA ? 'N/A' : `${pct}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
