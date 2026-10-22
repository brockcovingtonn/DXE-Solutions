import adminStyles from '@/components/admin.module.css';
import { ViewEmpty } from './ViewField';

// Shared compact view for Project Team / Interested Parties — reuses the
// exact roster row classes those editors already use for their own
// non-editing rows, just without the edit/delete icons or add-row button.
export default function RosterListView({ items, emptyLabel, tagField }) {
  if (!items || items.length === 0) {
    return <ViewEmpty>{emptyLabel}</ViewEmpty>;
  }

  return (
    <div>
      {items.map((item, i) => (
        <div className={adminStyles.rosterRow} key={i}>
          <div className={adminStyles.rosterInfo}>
            <div className={adminStyles.rosterName}>
              {item.name || '—'}
              {item[tagField] && <span className={adminStyles.rosterTrade}>{item[tagField]}</span>}
            </div>
            <div className={adminStyles.rosterMeta}>
              {[item.phone, item.email].filter(Boolean).join('  ·  ') || 'No contact info'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
