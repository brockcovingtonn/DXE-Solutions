'use client';

export default function CourseProgressTable({ employees, modules, progressByEmployee }) {
  if (!employees || employees.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No employees yet.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', position: 'sticky', left: 0, background: 'var(--surface, #fff)' }}>Employee</th>
            {modules.map((m) => (
              <th key={m} style={{ padding: '0.5rem 0.5rem', writingMode: 'vertical-rl', textOrientation: 'mixed', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {m}
              </th>
            ))}
            <th style={{ padding: '0.5rem 0.75rem' }}>Done</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const prog = progressByEmployee[emp.id] || {};
            const passedCount = modules.filter((m) => prog[m]?.passed).length;
            return (
              <tr key={emp.id} style={{ borderTop: '1px solid rgba(var(--border-rgb),0.1)' }}>
                <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--surface, #fff)' }}>
                  {emp.first_name} {emp.last_name}
                </td>
                {modules.map((m) => {
                  const p = prog[m];
                  let mark = '·';
                  let color = 'var(--text-tertiary)';
                  if (p?.passed) { mark = `${p.best_score}%`; color = 'var(--text-success)'; }
                  else if (p?.reviewed) { mark = '…'; color = 'var(--gold)'; }
                  return (
                    <td key={m} style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color, fontWeight: p?.passed ? 600 : 400 }}>
                      {mark}
                    </td>
                  );
                })}
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>
                  {passedCount}/{modules.length}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
