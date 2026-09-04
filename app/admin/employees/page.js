import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';

export default async function AdminEmployeesPage() {
  const supabase = createClient();

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('is_employee', true)
    .order('first_name');

  const { data: assignments } = await supabase
    .from('project_employees')
    .select('employee_id, projects(id, name, status)');

  const projectsByEmployee = {};
  (assignments || []).forEach((a) => {
    if (!a.projects) return;
    if (!projectsByEmployee[a.employee_id]) projectsByEmployee[a.employee_id] = [];
    projectsByEmployee[a.employee_id].push(a.projects);
  });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Employees</h1>
        <p>Manage team member accounts and project assignments</p>
      </div>

      <div className={adminStyles.actionsRow}>
        <Link href="/admin/employees/new" className="btn-navy">
          <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i>
          New Employee
        </Link>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>All Employees ({(employees || []).length})</h3>
        {!employees || employees.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>
            No employee accounts yet. Click &quot;New Employee&quot; to add your first one.
          </p>
        ) : (
          <div className={adminStyles.clientList}>
            {employees.map((employee) => (
              <div className={adminStyles.clientRow} key={employee.id}>
                <div className={adminStyles.clientInfo}>
                  <Link href={`/admin/employees/${employee.id}`} className={adminStyles.clientNameLink}>
                    <div className={adminStyles.clientName}>
                      {employee.first_name} {employee.last_name}
                    </div>
                  </Link>
                  <div className={adminStyles.clientEmail}>{employee.email}</div>
                </div>
                <div className={adminStyles.clientProjects}>
                  {(projectsByEmployee[employee.id] || []).map((proj) => (
                    <Link
                      href={`/admin/projects/${proj.id}`}
                      key={proj.id}
                      className={adminStyles.projectChip}
                    >
                      {proj.name}
                      <span className={adminStyles.projectChipStatus}>{proj.status}</span>
                    </Link>
                  ))}
                  {(!projectsByEmployee[employee.id] || projectsByEmployee[employee.id].length === 0) && (
                    <span style={{ fontSize: '0.78rem', color: '#a0aec0' }}>No projects assigned</span>
                  )}
                </div>
                <Link href={`/admin/employees/${employee.id}`} className={adminStyles.addProjectLink}>
                  <i className="ti ti-adjustments" aria-hidden="true"></i> Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
