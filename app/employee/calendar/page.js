import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import styles from '@/components/portal-shared.module.css';
import ClientCalendar from '@/components/ClientCalendar';
import EmployeeCalendarQuickAdd from '@/components/EmployeeCalendarQuickAdd';
import GoogleCalendarConnection from '@/components/GoogleCalendarConnection';

export default async function EmployeeCalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // RLS already scopes this to events on projects the employee is
  // assigned to — no explicit filter needed here.
  const [{ data: events }, { data: assignments }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*, projects(name, color)')
      .order('start_time'),
    supabase
      .from('project_employees')
      .select('projects(id, name)')
      .eq('employee_id', user.id),
  ]);

  const projects = (assignments || []).map((a) => a.projects).filter(Boolean);

  // Service-role check only — this table has no client-readable RLS
  // policy, so this must go through the admin client. We only ever
  // surface a boolean to the page, never the tokens themselves.
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from('google_calendar_connections')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Calendar</h1>
        <p>Events on projects you&apos;re assigned to</p>
      </div>

      <div className={styles.fullWidthCard}>
        <GoogleCalendarConnection googleConnected={!!connection} />
        <EmployeeCalendarQuickAdd projects={projects} />
        <ClientCalendar events={events || []} />
      </div>
    </div>
  );
}
