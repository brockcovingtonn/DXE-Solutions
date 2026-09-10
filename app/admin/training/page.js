import { createClient } from '@/lib/supabase-server';
import { orderedModules } from '@/lib/training-course';
import styles from '@/components/portal-shared.module.css';
import TrainingAdminView from '@/components/admin/TrainingAdminView';

export default async function AdminTrainingPage() {
  const supabase = createClient();

  const [{ data: steps }, { data: questions }, { data: employees }, { data: progressRows }] = await Promise.all([
    supabase.from('training_steps').select('*').order('sort_order'),
    supabase.from('training_quiz_questions').select('*').order('sort_order'),
    supabase.from('profiles').select('id, first_name, last_name').eq('is_employee', true).order('first_name'),
    supabase.from('training_course_progress').select('employee_id, category, reviewed, passed, best_score'),
  ]);

  const stepsByCategory = {};
  (steps || []).forEach((s) => {
    (stepsByCategory[s.project_type] ||= []).push(s);
  });

  const questionsByCategory = {};
  (questions || []).forEach((q) => {
    (questionsByCategory[q.category] ||= []).push(q);
  });

  const progressByEmployee = {};
  (progressRows || []).forEach((r) => {
    (progressByEmployee[r.employee_id] ||= {})[r.category] = r;
  });

  const modules = orderedModules(Object.keys(stepsByCategory));

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Training</h1>
        <p>Manage the step-by-step guide, the course quizzes, and see how far each employee has gotten</p>
      </div>

      <div className={styles.fullWidthCard}>
        <TrainingAdminView
          stepsByCategory={stepsByCategory}
          questionsByCategory={questionsByCategory}
          employees={employees || []}
          modules={modules}
          progressByEmployee={progressByEmployee}
        />
      </div>
    </div>
  );
}
