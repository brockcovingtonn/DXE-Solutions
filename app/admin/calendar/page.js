import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import styles from '@/components/portal-shared.module.css';
import AdminCalendar from '@/components/admin/AdminCalendar';

export default async function AdminCalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: events }, { data: projects }, { data: people }, { data: contacts }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*, projects(name), calendar_event_guests(email, name), calendar_event_contacts(contact_id)')
      .order('start_time'),
    supabase.from('projects').select('id, name').order('name'),
    supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .or('is_admin.eq.true,is_employee.eq.true')
      .order('first_name'),
    supabase.from('contacts').select('*').order('name'),
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
        <AdminCalendar initialEvents={events || []} projects={projects || []} people={people || []} contacts={contacts || []} googleConnected={!!connection} />
      </div>
    </div>
  );
}
