import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import AssistantChat from '@/components/AssistantChat';

export default async function PortalAssistantPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Assistant</h1>
        <p>Ask about your project, your permits, your calendar, or anything else on your portal</p>
      </div>

      <div className={styles.fullWidthCard}>
        <AssistantChat projects={projects || []} initialProjectId={projects?.[0]?.id} />
      </div>
    </div>
  );
}
