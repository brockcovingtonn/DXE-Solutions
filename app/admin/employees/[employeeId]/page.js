import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import EmployeeInfoForm from '@/components/admin/EmployeeInfoForm';
import EmployeeProjectsForm from '@/components/admin/EmployeeProjectsForm';

export default async function EmployeeDetailPage({ params }) {
  const supabase = createClient();

  const { data: employee } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone, is_employee')
    .eq('id', params.employeeId)
    .eq('is_employee', true)
    .single();

  if (!employee) notFound();

  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, name, status')
    .order('created_at', { ascending: false });

  const { data: assignments } = await supabase
    .from('project_employees')
    .select('project_id')
    .eq('employee_id', employee.id);

  const assignedProjectIds = (assignments || []).map((a) => a.project_id);

  return (
    <div>
      <Link href="/admin/employees" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to employees
      </Link>
      <div className={styles.portalHeader}>
        <h1>{employee.first_name} {employee.last_name}</h1>
        <p>{employee.email}</p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Employee details</h3>
        <EmployeeInfoForm employee={employee} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Assigned projects</h3>
        <EmployeeProjectsForm
          employeeId={employee.id}
          allProjects={allProjects || []}
          assignedProjectIds={assignedProjectIds}
        />
      </div>
    </div>
  );
}
