import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import ClientCalendar from '@/components/ClientCalendar';
import EmployeeCalendarQuickAdd from '@/components/EmployeeCalendarQuickAdd';

export default async function EmployeeCalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // RLS already scopes this to events on projects the employee is
  // assigned to — no explicit filter needed here.
  const [{ data: events }, { data: assignments }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*, projects(name)')
      .order('start_time'),
    supabase
      .from('project_employees')
      .select('projects(id, name)')
      .eq('employee_id', user.id),
  ]);

  const projects = (assignments || []).map((a) => a.projects).filter(Boolean);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Calendar</h1>
        <p>Events on projects you&apos;re assigned to</p>
      </div>

      <div className={styles.fullWidthCard}>
        <EmployeeCalendarQuickAdd projects={projects} />
        <ClientCalendar events={events || []} />
      </div>
    </div>
  );
}
