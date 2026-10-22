import { ViewEmpty } from './ViewField';

export default function AssignedEmployeesView({ allEmployees, assignedEmployeeIds }) {
  const assigned = (allEmployees || []).filter((e) => (assignedEmployeeIds || []).includes(e.id));

  if (assigned.length === 0) {
    return <ViewEmpty>No employees assigned yet.</ViewEmpty>;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {assigned.map((e) => (
        <span
          key={e.id}
          style={{
            fontSize: '0.8rem',
            color: 'var(--navy)',
            background: 'var(--surface)',
            padding: '0.3rem 0.7rem',
            border: '1px solid rgba(var(--border-rgb),0.12)',
          }}
        >
          {e.first_name} {e.last_name}
        </span>
      ))}
    </div>
  );
}
