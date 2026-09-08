'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import adminStyles from '@/components/admin.module.css';

const emptyForm = { kind: 'invoice', description: '', amount: '', dueDate: '' };

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function AccountingEditor({ projectId, initialInvoices }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const balanceDue = (initialInvoices || [])
    .filter((i) => i.kind === 'invoice' && i.status === 'unpaid')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;

    setSaving(true);
    setError('');

    try {
      let filePath = null;
      let fileName = null;

      if (file) {
        filePath = `${projectId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-invoices')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        fileName = file.name;
      }

      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          kind: form.kind,
          description: form.description,
          amount: Number(form.amount),
          dueDate: form.dueDate || null,
          filePath,
          fileName,
        }),
      });

      if (!res.ok) throw new Error();

      setForm(emptyForm);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Could not save this entry.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePaid(item) {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/invoices/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: item.status === 'paid' ? 'unpaid' : 'paid' }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div
        style={{
          padding: '1rem 1.25rem',
          background: 'var(--surface)',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Balance Due
        </span>
        <span style={{ fontSize: '1.3rem', fontWeight: 600, color: balanceDue > 0 ? 'var(--text-error)' : 'var(--navy)' }}>
          {formatCurrency(balanceDue)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {(initialInvoices || []).map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              border: '1px solid rgba(var(--border-rgb),0.12)',
              opacity: busyId === item.id ? 0.6 : 1,
            }}
          >
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0.2rem 0.5rem',
                background: item.kind === 'receipt' ? 'rgba(59,130,246,0.12)' : 'rgba(201,168,87,0.18)',
                color: item.kind === 'receipt' ? '#1e40af' : '#7a5c0a',
                flexShrink: 0,
              }}
            >
              {item.kind}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.88rem', color: 'var(--navy)', fontWeight: 500 }}>{item.description}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                {item.due_date ? `Due ${item.due_date}` : item.paid_date ? `Paid ${item.paid_date}` : '—'}
                {item.file_name && (
                  <>
                    {' · '}
                    <a href={`/api/invoices/${item.id}/download`} style={{ color: 'var(--gold)' }}>
                      {item.file_name}
                    </a>
                  </>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
              {formatCurrency(item.amount)}
            </div>
            {item.kind === 'invoice' && (
              <button
                type="button"
                onClick={() => togglePaid(item)}
                disabled={busyId === item.id}
                className={adminStyles.iconBtn}
                title={item.status === 'paid' ? 'Paid — click to mark unpaid' : 'Unpaid — click to mark paid'}
                style={{ color: item.status === 'paid' ? 'var(--text-success)' : 'var(--text-error)' }}
              >
                <i className={`ti ${item.status === 'paid' ? 'ti-circle-check' : 'ti-circle-dashed'}`} aria-hidden="true"></i>
              </button>
            )}
            <button
              type="button"
              className={adminStyles.iconBtn}
              onClick={() => handleDelete(item.id)}
              disabled={busyId === item.id}
              aria-label="Delete entry"
            >
              <i className="ti ti-trash" aria-hidden="true"></i>
            </button>
          </div>
        ))}
        {(!initialInvoices || initialInvoices.length === 0) && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No invoices or receipts yet.</p>
        )}
      </div>

      <form onSubmit={handleAdd}>
        <div className={adminStyles.formGrid2}>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Type</label>
            <select className={adminStyles.fieldInput} name="kind" value={form.kind} onChange={handleFormChange}>
              <option value="invoice">Invoice (client owes)</option>
              <option value="receipt">Receipt (expense paid on client's behalf)</option>
            </select>
          </div>
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Amount</label>
            <input
              className={adminStyles.fieldInput}
              type="number"
              step="0.01"
              min="0"
              name="amount"
              value={form.amount}
              onChange={handleFormChange}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Description</label>
          <input
            className={adminStyles.fieldInput}
            name="description"
            value={form.description}
            onChange={handleFormChange}
            placeholder="e.g. Permit management fee — Phase 2"
          />
        </div>

        {form.kind === 'invoice' && (
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Due date (optional)</label>
            <input
              className={adminStyles.fieldInput}
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleFormChange}
            />
          </div>
        )}

        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Attach PDF (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {error && <p className={adminStyles.formMsgError}>{error}</p>}

        <div className={adminStyles.saveBar}>
          <button type="submit" className="btn-navy" disabled={saving || !form.description.trim() || !form.amount}>
            {saving ? 'Adding...' : 'Add entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
