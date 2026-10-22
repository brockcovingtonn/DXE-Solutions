import styles from '@/components/portal-shared.module.css';
import { ViewEmpty } from './ViewField';

// Reuses the same read-only milestone timeline look already used on the
// employee/client pages, instead of inventing a new one.
export default function MilestonesView({ milestones }) {
  if (!milestones || milestones.length === 0) {
    return <ViewEmpty>No milestones added yet.</ViewEmpty>;
  }

  return (
    <div className={styles.statusSteps}>
      {milestones.map((m, i) => (
        <div className={styles.statusStep} key={i}>
          <div
            className={`${styles.stepDot} ${
              m.state === 'done' ? styles.stepDotDone : m.state === 'active' ? styles.stepDotActive : styles.stepDotPending
            }`}
          >
            {m.state === 'done' ? (
              <i className="ti ti-check" style={{ fontSize: '0.75rem' }}></i>
            ) : m.state === 'active' ? (
              <i className="ti ti-clock" style={{ fontSize: '0.75rem' }}></i>
            ) : (
              '·'
            )}
          </div>
          <div>
            <div className={styles.stepName}>{m.name}</div>
            {m.display_date && <div className={styles.stepDate}>{m.display_date}</div>}
            {m.notes && <div className={styles.stepNotes}>{m.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
