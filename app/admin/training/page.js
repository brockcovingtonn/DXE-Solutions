import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import TrainingAdminTabs from '@/components/admin/TrainingAdminTabs';

export default async function AdminTrainingPage() {
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
        <p>Manage the step-by-step guide employees use to run each type of project</p>
      </div>

      <div className={styles.fullWidthCard}>
        <TrainingAdminTabs stepsByCategory={stepsByCategory} />
      </div>
    </div>
  );
}
