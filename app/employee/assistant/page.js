import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import AssistantChat from '@/components/AssistantChat';

export default async function EmployeeAssistantPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assignments } = await supabase
    .from('project_employees')
    .select('projects(id, name)')
    .eq('employee_id', user.id);

  const projects = (assignments || []).map((a) => a.projects).filter(Boolean);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Assistant</h1>
        <p>Ask what to do next, check training steps, or look up anything on your assigned projects</p>
      </div>

      <div className={styles.fullWidthCard}>
        <AssistantChat projects={projects} initialProjectId={projects?.[0]?.id} />
      </div>
    </div>
  );
}
