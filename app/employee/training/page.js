import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import EmployeeTrainingBrowser from '@/components/EmployeeTrainingBrowser';

export default async function EmployeeTrainingPage() {
  const supabase = createClient();

  const { data: steps } = await supabase
    .from('training_steps')
    .select('*')
    .order('sort_order');

  const stepsByCategory = {};
  (steps || []).forEach((s) => {
    if (!stepsByCategory[s.project_type]) stepsByCategory[s.project_type] = [];
    stepsByCategory[s.project_type].push(s);
  });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Training</h1>
        <p>How DXE runs a project, step by step, by project type</p>
      </div>

      <div className={styles.fullWidthCard}>
        <EmployeeTrainingBrowser stepsByCategory={stepsByCategory} />
      </div>
    </div>
  );
}
