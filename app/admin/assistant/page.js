import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import AssistantChat from '@/components/AssistantChat';

export default async function AdminAssistantPage() {
  const supabase = createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name');

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Assistant</h1>
        <p>Ask about any project, manage Action Items and the calendar, or generate documents from a template</p>
      </div>

      <div className={styles.fullWidthCard}>
        <AssistantChat projects={projects || []} />
      </div>
    </div>
  );
}
