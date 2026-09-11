'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

function formatDate(d) {
  if (!d) return '';
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Some milestones are priced against a work event rather than a
// calendar date (e.g. "upon utility completion") — those have no
// due_date and never get reminders or an auto-sent invoice.
function isUndated(item) {
  return !item.due_date;
}

const STATUS_STYLE = {
  scheduled: { bg: 'rgba(201,168,87,0.15)', color: '#7a5c0a', label: 'Scheduled' },
  invoiced: { bg: 'rgba(62,84,104,0.12)', color: 'var(--navy)', label: 'Invoiced' },
  paid: { bg: 'rgba(16,185,129,0.12)', color: 'var(--text-success)', label: 'Paid' },
  skipped: { bg: 'rgba(148,163,184,0.15)', color: 'var(--text-tertiary)', label: 'Skipped' },
};

const emptyForm = { description: '', amount: '', percent: '', dueDate: '' };

export default function PaymentScheduleEditor({ projectId, initialItems }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems || []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalScheduled = items.filter((i) => i.status === 'scheduled').reduce((sum, i) => sum + Number(i.amount), 0);

  async function refresh() {
    const res = await fetch(`/api/admin/payment-schedule?projectId=${projectId}`);
    const data = await res.json();
    if (data.items) setItems(data.items);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) {
      setError('Description and amount are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/payment-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add milestone.');
      setForm(emptyForm);
      setAdding(false);
      await refresh();
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(item) {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/payment-schedule/${item.id}/confirm`, { method: 'POST' });
      await refresh();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkInvoiced(item) {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/payment-schedule/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'invoiced' }),
      });
      await refresh();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this payment milestone? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/payment-schedule/${id}`, { method: 'DELETE' });
      await refresh();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {items.length === 0 ? 'No payment schedule set for this project.' : `${formatCurrency(totalScheduled)} still scheduled`}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {items.map((item) => {
          const s = STATUS_STYLE[item.status] || STATUS_STYLE.scheduled;
          const undated = isUndated(item);
          const overdue = !undated && item.status === 'scheduled' && !item.confirmed_at && new Date(`${item.due_date}T00:00:00`) < new Date(new Date().toDateString());
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid rgba(var(--border-rgb),0.12)', opacity: busyId === item.id ? 0.6 : 1, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', background: s.bg, color: s.color, flexShrink: 0 }}>
                {s.label}
              </span>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--navy)' }}>
                  {item.description}
                  {item.percent ? ` (${item.percent}%)` : ''}
                </div>
                <div style={{ fontSize: '0.75rem', color: overdue ? 'var(--text-error)' : 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                  {undated ? 'No due date — invoice manually when this milestone is reached' : `Due ${formatDate(item.due_date)}`}
                  {!undated && (item.confirmed_at ? ` · Confirmed on schedule` : item.status === 'scheduled' ? ' · Not yet confirmed' : '')}
                  {overdue ? ' · Past due, unconfirmed' : ''}
                </div>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>{formatCurrency(item.amount)}</div>
              {item.status === 'scheduled' && !undated && (
                <button
                  type="button"
                  className={adminStyles.iconBtn}
                  onClick={() => handleConfirm(item)}
                  disabled={busyId === item.id}
                  title={item.confirmed_at ? 'Confirmed — click to reconfirm' : 'Confirm still on schedule'}
                  style={{ color: item.confirmed_at ? 'var(--text-success)' : undefined }}
                >
                  <i className={`ti ${item.confirmed_at ? 'ti-circle-check' : 'ti-circle'}`} aria-hidden="true"></i>
                </button>
              )}
              {item.status === 'scheduled' && undated && (
                <button
                  type="button"
                  className={adminStyles.iconBtn}
                  onClick={() => handleMarkInvoiced(item)}
                  disabled={busyId === item.id}
                  title="Mark invoiced — after you've sent the invoice for this milestone yourself"
                >
                  <i className="ti ti-receipt" aria-hidden="true"></i>
                </button>
              )}
              <button type="button" className={adminStyles.iconBtn} aria-label="Delete milestone" onClick={() => handleDelete(item.id)} disabled={busyId === item.id}>
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          );
        })}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className={adminStyles.adminForm} style={{ padding: '1rem', border: '1px solid rgba(var(--border-rgb),0.12)', marginBottom: '1rem' }}>
          <div className={adminStyles.formGrid2}>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Milestone description</label>
              <input
                className={adminStyles.fieldInput}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Plan Check Progress Payment"
              />
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Due date (optional)</label>
              <input
                type="date"
                className={adminStyles.fieldInput}
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.3rem' }}>
                Leave blank for an event-triggered milestone (e.g. "upon utility completion") — it'll be tracked but won't get reminders or auto-invoice.
              </p>
            </div>
          </div>
          <div className={adminStyles.formGrid2}>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Amount</label>
              <input
                type="number"
                step="0.01"
                className={adminStyles.fieldInput}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Percent of total (optional)</label>
              <input
                type="number"
                step="0.01"
                className={adminStyles.fieldInput}
                value={form.percent}
                onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value }))}
              />
            </div>
          </div>
          {error && <p className={adminStyles.formMsgError}>{error}</p>}
          <div className={adminStyles.saveBar}>
            <button type="submit" className="btn-navy" disabled={saving}>
              {saving ? 'Adding...' : 'Add milestone'}
            </button>
            <button type="button" className={adminStyles.cancelBtn} onClick={() => { setAdding(false); setForm(emptyForm); setError(''); }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={adminStyles.saveBar}>
          <button type="button" className="btn-navy" onClick={() => setAdding(true)}>
            <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i> Add payment milestone
          </button>
        </div>
      )}
    </div>
  );
}
