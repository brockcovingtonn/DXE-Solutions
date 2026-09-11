import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import ClientCalendar from '@/components/ClientCalendar';

export default async function PortalCalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*, projects(name, color)')
    .eq('visible_to_client', true)
    .order('start_time');

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Calendar</h1>
        <p>Upcoming dates across all of your projects</p>
      </div>

      <div className={styles.fullWidthCard}>
        <ClientCalendar events={events || []} />
      </div>
    </div>
  );
}
