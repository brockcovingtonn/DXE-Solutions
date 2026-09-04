import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import ClientCalendar from '@/components/ClientCalendar';

export default async function ProjectCalendarPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('project_id', projectId)
    .eq('visible_to_client', true)
    .order('start_time');

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Calendar</h1>
        <p>{project.name} · Upcoming dates on this project</p>
      </div>

      <div className={styles.fullWidthCard}>
        <ClientCalendar events={events || []} />
      </div>
    </div>
  );
}
