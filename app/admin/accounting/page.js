import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import MasterAccountingList from '@/components/admin/MasterAccountingList';
import MasterAccountingFilters from '@/components/admin/MasterAccountingFilters';
import UpcomingPaymentsList from '@/components/admin/UpcomingPaymentsList';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default async function MasterAccountingPage({ searchParams }) {
  const supabase = createClient();
  const kindFilter = searchParams?.kind;
  const statusFilter = searchParams?.status;
  const approvalFilter = searchParams?.approval;

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

  const pendingCount = (allInvoices || []).filter((i) => i.approval_status === 'pending').length;

  const { data: upcomingPayments } = await supabase
    .from('payment_schedule_items')
    .select('*, projects(name, color)')
    .eq('status', 'scheduled')
    .not('due_date', 'is', null)
    .order('due_date');

  const filtered = (allInvoices || []).filter((i) => {
    if (kindFilter && i.kind !== kindFilter) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    if (approvalFilter && i.approval_status !== approvalFilter) return false;
    return true;
  });

  return (
    <div>
      <div className={styles.portalHeader}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>Accounting</h1>
            <p>Invoices and receipts across every project, in one place</p>
          </div>
          <a href="/api/admin/accounting/export" className="btn-navy">
            <i className="ti ti-file-export" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i> Export for tax expert
          </a>
        </div>
      </div>

      <div className={styles.statCards4}>
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
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Pending Approval</div>
          <div className={styles.scValue} style={{ color: pendingCount > 0 ? 'var(--text-error)' : 'var(--navy)' }}>
            {pendingCount}
          </div>
        </div>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Upcoming Payments</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
          Scheduled milestones grouped by month, so you can estimate expected income.
        </p>
        <UpcomingPaymentsList initialItems={upcomingPayments || []} />
      </div>

      <div className={adminStyles.actionsRow} style={{ justifyContent: 'flex-start' }}>
        <MasterAccountingFilters kind={kindFilter} status={statusFilter} approval={approvalFilter} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>All Entries ({filtered.length})</h3>
        <MasterAccountingList initialInvoices={filtered} />
      </div>
    </div>
  );
}
