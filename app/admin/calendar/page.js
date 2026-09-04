import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import styles from '@/components/portal-shared.module.css';
import AdminCalendar from '@/components/admin/AdminCalendar';

export default async function AdminCalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: events }, { data: projects }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*, projects(name)')
      .order('start_time'),
    supabase.from('projects').select('id, name').order('name'),
  ]);

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
        <p>Firm-wide schedule — tag an event to a client to show it on their portal</p>
      </div>

      <div className={styles.fullWidthCard}>
        <AdminCalendar initialEvents={events || []} projects={projects || []} googleConnected={!!connection} />
      </div>
    </div>
  );
}
