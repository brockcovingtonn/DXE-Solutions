import { ViewEmpty } from './ViewField';

// Muted slate (close to --text-tertiary) at low completion, blending up
// to the brand gold exactly at 100% — so color itself reads as progress
// instead of every in-progress phase looking identically "done".
const GRADIENT_START = { r: 160, g: 174, b: 192 };
const GRADIENT_END = { r: 201, g: 168, b: 87 }; // --gold

function phaseColor(pct) {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  const r = Math.round(GRADIENT_START.r + (GRADIENT_END.r - GRADIENT_START.r) * t);
  const g = Math.round(GRADIENT_START.g + (GRADIENT_END.g - GRADIENT_START.g) * t);
  const b = Math.round(GRADIENT_START.b + (GRADIENT_END.b - GRADIENT_START.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

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
