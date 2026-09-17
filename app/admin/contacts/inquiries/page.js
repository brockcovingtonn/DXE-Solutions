import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase-admin';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import EmptyState from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

// Every "Book a 15-min call" submission, regardless of project type —
// see app/api/estimate/route.js. Kept separate from the trade-professional
// `contacts` table (different shape, different purpose), but reachable
// from the same Contacts area.
export default async function InquiriesPage() {
  const db = createAdminClient();
  const { data } = await db.from('estimate_requests').select('*').order('created_at', { ascending: false }).limit(300);
  const rows = data || [];

  return (
    <div>
      <Link href="/admin/contacts" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to contacts
      </Link>
      <div className={styles.portalHeader}>
        <h1>Website Inquiries</h1>
        <p>Everyone who's submitted the public "Book a 15-min call" form</p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>All Inquiries ({rows.length})</h3>
        {rows.length === 0 ? (
          <EmptyState icon="ti-inbox" title="No inquiries yet" subtitle="Submissions from the public site will show up here." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  <th style={{ padding: '8px 10px 8px 0' }}>Name</th>
                  <th style={{ padding: '8px 10px' }}>Contact</th>
                  <th style={{ padding: '8px 10px' }}>Project type</th>
                  <th style={{ padding: '8px 10px' }}>How they heard about us</th>
                  <th style={{ padding: '8px 10px' }}>Details</th>
                  <th style={{ padding: '8px 0 8px 10px' }}>Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid rgba(var(--border-rgb),0.12)' }}>
                    <td style={{ padding: '10px 10px 10px 0', whiteSpace: 'nowrap' }}>
                      {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {r.email || '—'}
                      {r.phone ? <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.phone}</div> : null}
                    </td>
                    <td style={{ padding: '10px' }}>{r.project_type || '—'}</td>
                    <td style={{ padding: '10px' }}>
                      {r.hear_about || '—'}
                      {r.referral_name ? <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Ref: {r.referral_name}</div> : null}
                    </td>
                    <td style={{ padding: '10px', maxWidth: 320 }}>{r.details || '—'}</td>
                    <td style={{ padding: '10px 0 10px 10px', whiteSpace: 'nowrap', color: 'var(--text-tertiary)', fontSize: 13 }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
