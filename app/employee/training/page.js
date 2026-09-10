import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { orderedModules, courseCompletion } from '@/lib/training-course';
import styles from '@/components/portal-shared.module.css';
import EmployeeTrainingBrowser from '@/components/EmployeeTrainingBrowser';

export default async function EmployeeTrainingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: steps }, { data: progressRows }] = await Promise.all([
    supabase.from('training_steps').select('*').order('sort_order'),
    user
      ? supabase.from('training_course_progress').select('category, passed').eq('employee_id', user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const stepsByCategory = {};
  (steps || []).forEach((s) => {
    if (!stepsByCategory[s.project_type]) stepsByCategory[s.project_type] = [];
    stepsByCategory[s.project_type].push(s);
  });

  const modules = orderedModules(Object.keys(stepsByCategory));
  const progress = Object.fromEntries((progressRows || []).map((r) => [r.category, r]));
  const completion = courseCompletion(modules, progress);
  const started = completion.passed > 0;

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Training</h1>
        <p>How DXE runs a project, step by step, by project type</p>
      </div>

      <div className={styles.fullWidthCard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem' }}>Take the course</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {started
              ? `${completion.passed} of ${completion.total} sections passed — pick up where you left off.`
              : 'Go through every section in order with a short quiz at the end of each.'}
          </p>
        </div>
        <Link href="/employee/training/course" className="btn-navy" style={{ whiteSpace: 'nowrap' }}>
          {started ? 'Resume course' : 'Take Course'}
        </Link>
      </div>

      <div className={styles.fullWidthCard}>
        <EmployeeTrainingBrowser stepsByCategory={stepsByCategory} />
      </div>
    </div>
  );
}
