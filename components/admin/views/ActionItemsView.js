import { ViewEmpty } from './ViewField';

export default function ActionItemsView({ items }) {
  if (!items || items.length === 0) {
    return <ViewEmpty>No action items yet.</ViewEmpty>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
          <i
            className={`ti ${item.status === 'done' ? 'ti-circle-check' : 'ti-circle-dashed'}`}
            aria-hidden="true"
            style={{ color: item.status === 'done' ? 'var(--text-success, #10b981)' : 'var(--text-tertiary)', flexShrink: 0 }}
          ></i>
          <span style={{ color: 'var(--navy)', textDecoration: item.status === 'done' ? 'line-through' : 'none', flex: 1 }}>
            {item.title}
          </span>
          {item.due_date && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Due {item.due_date}</span>}
        </div>
      ))}
    </div>
  );
}
