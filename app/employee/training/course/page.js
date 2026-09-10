import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { orderedModules, resumeModuleIndex } from '@/lib/training-course';
import styles from '@/components/portal-shared.module.css';
import TrainingCourse from '@/components/TrainingCourse';

export default async function TrainingCoursePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  const [{ data: steps }, { data: questions }, { data: progressRows }] = await Promise.all([
    supabase.from('training_steps').select('*').order('sort_order'),
    // Read questions with the service-role key and strip correct_index —
    // employees must never receive the answer key.
    admin.from('training_quiz_questions').select('id, category, sort_order, question, options').order('sort_order'),
    supabase.from('training_course_progress').select('category, reviewed, passed, best_score').eq('employee_id', user.id),
  ]);

  const stepsByCategory = {};
  (steps || []).forEach((s) => {
    (stepsByCategory[s.project_type] ||= []).push(s);
  });

  const quizzesByCategory = {};
  (questions || []).forEach((q) => {
    (quizzesByCategory[q.category] ||= []).push({ id: q.id, question: q.question, options: q.options });
  });

  const modules = orderedModules(Object.keys(stepsByCategory));
  const progress = Object.fromEntries((progressRows || []).map((r) => [r.category, r]));
  const resumeIndex = resumeModuleIndex(modules, progress);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Training Course</h1>
        <p>
          Work through each section in order and pass its quiz to unlock the next.{' '}
          <Link href="/employee/training" style={{ color: 'var(--gold)' }}>
            Back to the training library
          </Link>
        </p>
      </div>

      <div className={styles.fullWidthCard}>
        <TrainingCourse
          modules={modules}
          stepsByCategory={stepsByCategory}
          quizzesByCategory={quizzesByCategory}
          initialProgress={progress}
          resumeIndex={resumeIndex}
        />
      </div>
    </div>
  );
}
