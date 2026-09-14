'use client';

import { useState, useEffect } from 'react';
import adminStyles from '@/components/admin.module.css';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

export default function GeneratePaymentScheduleModal({ proposalId, onClose, onGenerated }) {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/proposals/${proposalId}/generate-payment-schedule`)
      .then((res) => res.json())
      .then((data) => {
        setTotal(data.total || 0);
        setRows((data.suggestedMilestones || []).map((m) => ({ ...m, dueDate: '' })));
      })
      .finally(() => setLoading(false));
  }, [proposalId]);

  function updateRow(index, patch) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        // Keep amount in sync with percent unless the amount itself was
        // just hand-edited — recomputing off a stale percent after a
        // direct amount edit would overwrite what the admin just typed.
        if ('percent' in patch && patch.percent !== '') {
          next.amount = Math.round(total * (Number(patch.percent) / 100) * 100) / 100;
        }
        return next;
      })
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { description: '', percent: '', amount: '', dueDate: '' }]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const totalScheduled = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalMismatch = rows.length > 0 && Math.abs(totalScheduled - total) > 0.01;

  async function handleCreate() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/proposals/${proposalId}/generate-payment-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create the payment schedule.');
      onGenerated?.(data.items);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--white)', maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 0.3rem' }}>Generate Payment Schedule</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '1.25rem' }}>
          Parsed from this proposal&apos;s payment terms — review and adjust before creating the milestones.
        </p>

        {loading ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading…</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
              {rows.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <input
                    className={adminStyles.fieldInput}
                    style={{ flex: 2, minWidth: '160px' }}
                    placeholder="Milestone description"
                    value={row.description}
                    onChange={(e) => updateRow(i, { description: e.target.value })}
                  />
                  <input
                    className={adminStyles.fieldInput}
                    style={{ width: '80px' }}
                    type="number"
                    step="0.01"
                    placeholder="%"
                    value={row.percent}
                    onChange={(e) => updateRow(i, { percent: e.target.value })}
                  />
                  <input
                    className={adminStyles.fieldInput}
                    style={{ width: '110px' }}
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => updateRow(i, { amount: e.target.value })}
                  />
                  <input
                    className={adminStyles.fieldInput}
                    style={{ width: '150px' }}
                    type="date"
                    value={row.dueDate}
                    onChange={(e) => updateRow(i, { dueDate: e.target.value })}
                    title="Due date (optional — leave blank for an event-triggered milestone)"
                  />
                  <button type="button" className={adminStyles.iconBtn} onClick={() => removeRow(i)} aria-label="Remove milestone">
                    <i className="ti ti-trash" aria-hidden="true"></i>
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className={adminStyles.cancelBtn} onClick={addRow} style={{ marginBottom: '1rem' }}>
              <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: '0.3rem' }}></i> Add milestone
            </button>

            <div style={{ fontSize: '0.8rem', color: totalMismatch ? 'var(--text-error)' : 'var(--text-secondary)', marginBottom: '1rem' }}>
              Scheduled: {formatCurrency(totalScheduled)} of {formatCurrency(total)} proposal total
              {totalMismatch ? ' — doesn’t add up, but you can still create it' : ''}
            </div>

            {error && <p className={adminStyles.formMsgError}>{error}</p>}

            <div className={adminStyles.saveBar}>
              <button type="button" className="btn-navy" onClick={handleCreate} disabled={saving || rows.length === 0}>
                {saving ? 'Creating…' : `Create ${rows.length} milestone${rows.length === 1 ? '' : 's'}`}
              </button>
              <button type="button" className={adminStyles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
