import styles from '@/components/portal-shared.module.css';
import { phaseColor } from '@/lib/phase-color';

// Read-only phase bar shown on the client + employee project views —
// same gradient-by-completion coloring as the admin project page's
// Project Phases (lib/phase-color.js), so progress reads the same way
// everywhere: a muted slate at low completion blends up to solid gold
// at 100%, a 0%/N/A phase is plain text with no fill, and an "active"
// phase gets a navy underline accent.
export default function PhaseBar({ phases }) {
  if (!phases || phases.length === 0) return null;

  return (
    <div className={styles.progressPhases}>
      {phases.map((ph) => {
        const isNA = ph.state === 'na';
        const pct = Math.max(0, Math.min(100, ph.pct ?? 0));
        const hasFill = !isNA && pct > 0;
        const isActive = ph.state === 'active';
        return (
          <div
            key={ph.id}
            className={styles.phaseBlock}
            style={{
              background: hasFill ? phaseColor(pct) : 'transparent',
              borderBottomColor: isActive ? 'var(--navy)' : 'transparent',
            }}
          >
            <div className={styles.phName} style={{ color: hasFill ? 'var(--navy)' : undefined }}>
              {ph.name}
            </div>
            {!isNA && (
              <div className={styles.phPct} style={{ color: hasFill ? 'var(--navy)' : undefined }}>
                {pct}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
