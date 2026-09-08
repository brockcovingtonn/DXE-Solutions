import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import WeekStripCalendar from '@/components/WeekStripCalendar';
import ClientChatCard from '@/components/ClientChatCard';

export default async function PortalIndexPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_employee, first_name')
    .eq('id', user.id)
    .single();

  if (profile?.is_admin) redirect('/admin/dashboard');
  if (profile?.is_employee) redirect('/employee/dashboard');

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const windowEnd = new Date(weekStart);
  windowEnd.setDate(windowEnd.getDate() + 21);

  const [{ data: projects }, { data: calendarEvents }, { data: admins }, { data: messages }, { data: unread }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, address, project_type')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('calendar_events')
      .select('*, projects(name)')
      .eq('visible_to_client', true)
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', windowEnd.toISOString())
      .order('start_time'),
    supabase.from('profiles').select('id, first_name, last_name').eq('is_admin', true),
    supabase
      .from('messages')
      .select('*')
      .is('project_id', null)
      .eq('dm_user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase.rpc('get_unread_message_counts'),
  ]);

  const participants = (admins || []).map((a) => ({ ...a, role: 'admin' }));
  const unreadByProject = Object.fromEntries((unread || []).filter((r) => r.project_id).map((r) => [r.project_id, r.unread_count]));

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}</h1>
        <p>Here&apos;s what&apos;s coming up and a direct line to Dixie.</p>
      </div>

      <div className={styles.portalGrid}>
        <div className={styles.portalCard}>
          <h3>This Week</h3>
          <WeekStripCalendar events={calendarEvents || []} viewAllHref="/portal/calendar" />
        </div>

        <div className={styles.portalCard} style={{ display: 'flex', flexDirection: 'column' }}>
          <h3>Chat with DXE Solutions</h3>
          <div style={{ flex: 1, minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
            <ClientChatCard
              currentUserId={user.id}
              projects={(projects || []).map((p) => ({ id: p.id, name: p.name }))}
              initialMessages={messages || []}
              initialParticipants={participants}
            />
          </div>
        </div>
      </div>

      {projects && projects.length > 0 ? (
        <div>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 500, color: 'var(--navy)', marginBottom: '0.75rem' }}>
            My Projects
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/portal/projects/${project.id}/overview`}
                className={styles.fullWidthCard}
                style={{ margin: 0, display: 'block', color: 'inherit', textDecoration: 'none' }}
              >
                <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {project.name}
                  {unreadByProject[project.id] > 0 && (
                    <span
                      title="Unread messages"
                      style={{
                        background: 'var(--gold)',
                        color: 'var(--navy-dark)',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '0.05rem 0.4rem',
                        borderRadius: '999px',
                      }}
                    >
                      {unreadByProject[project.id]}
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  {project.address || 'No address on file'}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                  {project.project_type || 'Project type not set'}
                </p>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gold)', fontWeight: 600 }}>
                  {project.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.fullWidthCard}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            No projects have been added to your account yet. Once Dixie sets up your project, it will
            appear here automatically with status updates, documents, photos, and notes.
          </p>
        </div>
      )}
    </div>
  );
}
