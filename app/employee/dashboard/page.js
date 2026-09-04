import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import EmployeeActionItems from '@/components/EmployeeActionItems';
import WeekStripCalendar from '@/components/WeekStripCalendar';

export default async function EmployeeDashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const windowEnd = new Date(weekStart);
  windowEnd.setDate(windowEnd.getDate() + 21);

  const [{ data: assignments }, { data: actionItems }, { data: calendarEvents }] = await Promise.all([
    supabase
      .from('project_employees')
      .select('projects(id, name, status, address, project_type, profiles!projects_owner_id_fkey(first_name, last_name))')
      .eq('employee_id', user.id),
    supabase
      .from('action_items')
      .select('*, projects(name)')
      .eq('assigned_to', user.id)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('calendar_events')
      .select('*, projects(id, name)')
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', windowEnd.toISOString())
      .order('start_time'),
  ]);

  const projects = (assignments || []).map((a) => a.projects).filter(Boolean);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>My Projects</h1>
        <p>Projects you&apos;ve been assigned to</p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>This Week</h3>
        <WeekStripCalendar events={calendarEvents || []} viewAllHref="/employee/calendar" />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>My Action Items</h3>
        <EmployeeActionItems initialItems={actionItems || []} />
      </div>

      {projects.length === 0 ? (
        <div className={styles.fullWidthCard}>
          <p style={{ fontSize: '0.9rem', color: '#718096' }}>
            You haven&apos;t been assigned to any projects yet. Once an admin assigns you to a
            project, it will show up here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {projects.map((project) => (
            <div key={project.id} className={styles.fullWidthCard} style={{ margin: 0 }}>
              <h3 style={{ marginBottom: '0.5rem' }}>{project.name}</h3>
              <p style={{ fontSize: '0.82rem', color: '#718096', marginBottom: '0.25rem' }}>
                {project.address || 'No address on file'}
              </p>
              <p style={{ fontSize: '0.78rem', color: '#a0aec0', marginBottom: '0.75rem' }}>
                {project.project_type || 'Project type not set'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gold)', fontWeight: 600 }}>
                  {project.status}
                </span>
                <span style={{ color: '#a0aec0' }}>
                  {project.profiles ? `${project.profiles.first_name} ${project.profiles.last_name}` : 'Client'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Link
                  href={`/projects/${project.id}/cover-sheet`}
                  target="_blank"
                  style={{ fontSize: '0.75rem', color: 'var(--navy)', fontWeight: 500 }}
                >
                  <i className="ti ti-file-description" aria-hidden="true"></i> Cover sheet
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
