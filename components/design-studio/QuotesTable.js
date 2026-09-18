'use client';

import { useState } from 'react';
import Link from 'next/link';
import { C, money } from '@/lib/design-studio/brand';

const STATUS_STYLE = {
  draft: { bg: '#EFEFEC', fg: C.inkSoft },
  sent: { bg: '#E9EFF3', fg: '#3E5468' },
  accepted: { bg: '#E7F0EA', fg: C.good },
  declined: { bg: '#F5EAE4', fg: C.warn },
  expired: { bg: '#F0EFED', fg: C.muted },
};

export default function QuotesTable({ initialRows, isMaster, staffOptions }) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  async function deleteQuote(q) {
    if (!window.confirm(`Delete ${q.quote_number}? This can't be undone.`)) return;
    setBusyId(q.id);
    setError('');
    try {
      const res = await fetch(`/api/design-studio/quotes/${q.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete the quote.');
      setRows((prev) => prev.filter((r) => r.id !== q.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function reassign(q, staffId) {
    setBusyId(q.id);
    setError('');
    try {
      const res = await fetch(`/api/design-studio/quotes/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignTo: staffId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reassign the quote.');
      setRows((prev) =>
        prev.map((r) => (r.id === q.id ? { ...r, created_by: data.quote.created_by, created_by_name: data.quote.created_by_name } : r))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error ? <div style={{ fontSize: 12.5, color: C.warn, marginBottom: 10 }}>{error}</div> : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: C.muted, fontSize: 11.5, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              <th style={{ padding: '8px 10px 8px 0' }}>Quote</th>
              <th style={{ padding: '8px 10px' }}>Client</th>
              <th style={{ padding: '8px 10px' }}>Project</th>
              <th style={{ padding: '8px 10px' }}>Status</th>
              {isMaster ? <th style={{ padding: '8px 10px' }}>By</th> : null}
              <th style={{ padding: '8px 0 8px 10px', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '8px 0 8px 10px' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => {
              const st = STATUS_STYLE[q.status] || STATUS_STYLE.draft;
              const busy = busyId === q.id;
              return (
                <tr key={q.id} style={{ borderTop: `1px solid ${C.line}`, opacity: busy ? 0.5 : 1 }}>
                  <td style={{ padding: '11px 10px 11px 0', whiteSpace: 'nowrap' }}>
                    <Link href={`/design-studio/${q.id}`} className="ds-link" style={{ color: C.ink, fontWeight: 600, textDecoration: 'none' }}>
                      {q.quote_number}
                    </Link>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </td>
                  <td style={{ padding: '11px 10px' }}>
                    {q.client_name || '—'}
                    {q.source === 'web_lead' ? (
                      <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.clayDark, background: 'rgba(201,168,87,0.16)', padding: '2px 6px', borderRadius: 4 }}>
                        Submitted form
                      </span>
                    ) : null}
                    <div style={{ fontSize: 12, color: C.muted }}>{q.project_address || ''}</div>
                  </td>
                  <td style={{ padding: '11px 10px' }}>
                    {q.project_type}
                    <div style={{ fontSize: 12, color: C.muted }}>
                      {q.service_level} · {Number(q.area_sqft || 0).toLocaleString()} sf
                    </div>
                  </td>
                  <td style={{ padding: '11px 10px' }}>
                    <span style={{ background: st.bg, color: st.fg, padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                      {q.status}
                    </span>
                  </td>
                  {isMaster ? (
                    <td style={{ padding: '11px 10px' }}>
                      <select
                        value={q.created_by || ''}
                        onChange={(e) => e.target.value && reassign(q, e.target.value)}
                        disabled={busy}
                        style={{ fontSize: 13, color: C.muted, border: `1px solid ${C.line}`, borderRadius: 6, padding: '4px 6px', background: C.paper }}
                      >
                        {!staffOptions.some((s) => s.id === q.created_by) ? (
                          <option value="" disabled>{q.created_by_name || '—'}</option>
                        ) : null}
                        {staffOptions.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                  ) : null}
                  <td style={{ padding: '11px 0 11px 10px', textAlign: 'right', fontWeight: 600 }}>{money(q.total)}</td>
                  <td style={{ padding: '11px 0 11px 10px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => deleteQuote(q)}
                      disabled={busy}
                      aria-label={`Delete ${q.quote_number}`}
                      title="Delete quote"
                      style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: 6, width: 28, height: 28, cursor: busy ? 'default' : 'pointer', color: C.warn, fontSize: 14, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
