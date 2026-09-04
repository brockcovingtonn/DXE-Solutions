'use client';

import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

export default function MasterAccountingFilters({ kind, status }) {
  const router = useRouter();

  function update(next) {
    const params = new URLSearchParams();
    const merged = { kind, status, ...next };
    if (merged.kind) params.set('kind', merged.kind);
    if (merged.status) params.set('status', merged.status);
    const qs = params.toString();
    router.push(qs ? `/admin/accounting?${qs}` : '/admin/accounting');
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      <select
        className={adminStyles.fieldInput}
        style={{ maxWidth: '200px' }}
        value={kind || ''}
        onChange={(e) => update({ kind: e.target.value || undefined })}
      >
        <option value="">All types</option>
        <option value="invoice">Invoices</option>
        <option value="receipt">Receipts</option>
      </select>
      <select
        className={adminStyles.fieldInput}
        style={{ maxWidth: '200px' }}
        value={status || ''}
        onChange={(e) => update({ status: e.target.value || undefined })}
      >
        <option value="">Any status</option>
        <option value="unpaid">Unpaid</option>
        <option value="paid">Paid</option>
      </select>
    </div>
  );
}
