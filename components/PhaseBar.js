import styles from '@/components/portal-shared.module.css';

// Read-only segmented phase bar shown on the client + employee project
// views. Each segment is shaded by its completion %, so progress reads
// at a glance without opening each phase.
function shadeClass(phase) {
  if (phase.state === 'na') return styles.phasePctNa;
  if (phase.state === 'done' || phase.pct >= 100) return styles.phaseBlockDone;
  const p = Number(phase.pct) || 0;
  if (p >= 67) return styles.phasePct3;
  if (p >= 34) return styles.phasePct2;
  if (p >= 1) return styles.phasePct1;
  return styles.phasePct0;
}

export default function PhaseBar({ phases }) {
  if (!phases || phases.length === 0) return null;

  return (
    <div className={styles.progressPhases}>
      {phases.map((ph) => (
        <div
          key={ph.id}
          className={`${styles.phaseBlock} ${shadeClass(ph)} ${
            ph.state === 'active' ? styles.phaseBlockActive : ''
          }`}
        >
          <div className={styles.phName}>{ph.name}</div>
          {ph.state !== 'na' && <div className={styles.phPct}>{ph.pct}%</div>}
        </div>
      ))}
    </div>
  );
}
