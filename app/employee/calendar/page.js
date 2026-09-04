import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import ClientCalendar from '@/components/ClientCalendar';

export default async function EmployeeCalendarPage() {
  const supabase = createClient();

  // RLS already scopes this to events on projects the employee is
  // assigned to — no explicit filter needed here.
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*, projects(name)')
    .order('start_time');

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Calendar</h1>
        <p>Events on projects you&apos;re assigned to</p>
      </div>

      <div className={styles.fullWidthCard}>
        <ClientCalendar events={events || []} />
      </div>
    </div>
  );
}
