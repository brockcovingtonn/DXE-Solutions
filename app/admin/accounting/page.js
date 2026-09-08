import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import MasterAccountingList from '@/components/admin/MasterAccountingList';
import MasterAccountingFilters from '@/components/admin/MasterAccountingFilters';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default async function MasterAccountingPage({ searchParams }) {
  const supabase = createClient();
  const kindFilter = searchParams?.kind;
  const statusFilter = searchParams?.status;

  const { data: allInvoices } = await supabase
    .from('invoices')
    .select('*, projects(id, name, profiles!projects_owner_id_fkey(first_name, last_name))')
    .order('created_at', { ascending: false });

  const totalOutstanding = (allInvoices || [])
    .filter((i) => i.kind === 'invoice' && i.status === 'unpaid')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalPaid = (allInvoices || [])
    .filter((i) => i.kind === 'invoice' && i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalReceipts = (allInvoices || [])
    .filter((i) => i.kind === 'receipt')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const filtered = (allInvoices || []).filter((i) => {
    if (kindFilter && i.kind !== kindFilter) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Accounting</h1>
        <p>Invoices and receipts across every project, in one place</p>
      </div>

      <div className={styles.statCards3}>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Total Outstanding</div>
          <div className={styles.scValue} style={{ color: totalOutstanding > 0 ? 'var(--text-error)' : 'var(--navy)' }}>
            {formatCurrency(totalOutstanding)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Total Paid</div>
          <div className={styles.scValue}>{formatCurrency(totalPaid)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Total Receipts</div>
          <div className={styles.scValue}>{formatCurrency(totalReceipts)}</div>
        </div>
      </div>

      <div className={adminStyles.actionsRow} style={{ justifyContent: 'flex-start' }}>
        <MasterAccountingFilters kind={kindFilter} status={statusFilter} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>All Entries ({filtered.length})</h3>
        <MasterAccountingList initialInvoices={filtered} />
      </div>
    </div>
  );
}
