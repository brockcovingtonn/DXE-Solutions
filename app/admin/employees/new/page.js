import Link from 'next/link';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import NewEmployeeForm from '@/components/NewEmployeeForm';

export default function NewEmployeePage() {
  return (
    <div>
      <Link href="/admin/employees" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to employees
      </Link>
      <div className={styles.portalHeader}>
        <h1>New Employee</h1>
        <p>Create a login for a new team member</p>
      </div>

      <div className={styles.fullWidthCard}>
        <NewEmployeeForm />
      </div>
    </div>
  );
}
