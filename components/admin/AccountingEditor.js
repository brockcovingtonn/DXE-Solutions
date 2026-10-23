'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import adminStyles from '@/components/admin.module.css';
import Modal from '@/components/Modal';

const emptyForm = { kind: 'invoice', description: '', amount: '', dueDate: '', paidDate: '' };
const today = () => new Date().toISOString().slice(0, 10);

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function AccountingEditor({ projectId, initialInvoices, hideForm = false, hideList = false }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', amount: '', date: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [payingItem, setPayingItem] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', date: today(), description: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  // Remaining balance on an invoice is derived from its linked payment
  // rows rather than stored — kept in one place so the header sum, the
  // per-row display, and the Apply Payment default all agree.
  function remainingOf(item) {
    if (item.kind !== 'invoice' || item.status === 'paid') return 0;
    const paid = (initialInvoices || [])
      .filter((p) => p.kind === 'payment' && p.invoice_id === item.id)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return Number(item.amount) - paid;
  }

  const balanceDue = (initialInvoices || [])
    .filter((i) => i.kind === 'invoice' && i.status === 'unpaid')
    .reduce((sum, i) => sum + remainingOf(i), 0);

  function openEdit(item) {
    setEditError('');
    setEditForm({
      description: item.description || '',
      amount: item.amount,
      date: item.kind === 'invoice' ? item.due_date || '' : item.paid_date || '',
    });
    setEditingItem(item);
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editForm.description.trim() && editingItem.kind !== 'payment') return;
    if (!editForm.amount) return;

    setEditSaving(true);
    setEditError('');
    try {
      const body = { description: editForm.description.trim(), amount: Number(editForm.amount) };
      if (editingItem.kind === 'invoice') body.due_date = editForm.date || null;
      else body.paid_date = editForm.date || null;

      const res = await fetch(`/api/admin/invoices/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setEditingItem(null);
      router.refresh();
    } catch {
      setEditError('Could not save these changes.');
    } finally {
      setEditSaving(false);
    }
  }

  function openApplyPayment(item) {
    setPayError('');
    setPayForm({ amount: remainingOf(item), date: today(), description: '' });
    setPayingItem(item);
  }

  async function handleApplyPayment(e) {
    e.preventDefault();
    if (!payForm.amount) return;

    setPaySaving(true);
    setPayError('');
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          kind: 'payment',
          invoiceId: payingItem.id,
          amount: Number(payForm.amount),
          paidDate: payForm.date || null,
          description: payForm.description.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setPayingItem(null);
      router.refresh();
    } catch {
      setPayError('Could not apply this payment.');
    } finally {
      setPaySaving(false);
    }
  }

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
          paidDate: form.paidDate || null,
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

  async function setApproval(item, approval_status) {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/invoices/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleShared(item) {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/invoices/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_to_client: !item.visible_to_client }),
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
      {!hideList && (
      <>
      <div
        style={{
          padding: '0.85rem 1.1rem',
          background: 'var(--surface)',
          marginBottom: '1rem',
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

      <div style={{ marginBottom: '1rem' }}>
        {(initialInvoices || []).map((item) => {
          const remaining = remainingOf(item);
          const isPartial = item.kind === 'invoice' && item.status === 'unpaid' && remaining < Number(item.amount);
          const parentInvoice = item.kind === 'payment' ? (initialInvoices || []).find((i) => i.id === item.invoice_id) : null;
          return (
          <div
            key={item.id}
            className={adminStyles.listRow}
            style={{ opacity: busyId === item.id ? 0.6 : 1 }}
          >
            <span
              className={adminStyles.listRowPill}
              style={{
                background: item.kind === 'receipt' ? 'rgba(59,130,246,0.12)' : item.kind === 'payment' ? 'rgba(16,185,129,0.14)' : item.kind === 'reimbursement' ? 'rgba(147,51,234,0.12)' : 'rgba(201,168,87,0.18)',
                color: item.kind === 'receipt' ? '#1e40af' : item.kind === 'payment' ? '#047857' : item.kind === 'reimbursement' ? '#7e22ce' : '#7a5c0a',
              }}
            >
              {item.kind}
            </span>
            <div className={adminStyles.listRowMain}>
              <div className={adminStyles.listRowTitle}>{item.description}</div>
              <div className={adminStyles.listRowMeta}>
                {item.kind === 'payment' ? (
                  <>Applied to {parentInvoice?.description || 'an invoice'}{item.paid_date ? ` · ${item.paid_date}` : ''}</>
                ) : (
                  <>{item.due_date ? `Due ${item.due_date}` : item.paid_date ? `Paid ${item.paid_date}` : '—'}</>
                )}
                {isPartial && <> · {formatCurrency(remaining)} remaining of {formatCurrency(item.amount)}</>}
                {item.file_name && (
                  <>
                    {' · '}
                    <a href={`/api/invoices/${item.id}/download`} style={{ color: 'var(--gold)' }}>
                      {item.file_name}
                    </a>
                  </>
                )}
                {item.approval_status === 'pending' && <> · <span style={{ color: 'var(--text-error)' }}>Pending approval</span></>}
                {item.approval_status === 'rejected' && <> · <span style={{ color: 'var(--text-error)' }}>Rejected</span></>}
                {item.visible_to_client && <> · <span style={{ color: 'var(--text-success)' }}>Shared with client</span></>}
                {item.paid_via === 'stripe' && item.status === 'paid' && <> · <span style={{ color: 'var(--text-success)' }}>Paid online{item.payment_method ? ` (${item.payment_method})` : ''}</span></>}
                {item.payment_state === 'processing' && <> · <span style={{ color: 'var(--gold)' }}>Payment clearing (ACH)</span></>}
                {item.payment_state === 'failed' && <> · <span style={{ color: 'var(--text-error)' }}>Online payment failed</span></>}
              </div>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
              {formatCurrency(item.amount)}
            </div>
            {item.approval_status === 'pending' ? (
              <>
                <button
                  type="button"
                  onClick={() => setApproval(item, 'approved')}
                  disabled={busyId === item.id}
                  className="btn-navy"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem' }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setApproval(item, 'rejected')}
                  disabled={busyId === item.id}
                  className={adminStyles.cancelBtn}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.72rem' }}
                >
                  Reject
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => toggleShared(item)}
                disabled={busyId === item.id}
                className={adminStyles.iconBtn}
                title={item.visible_to_client ? 'Shared with client — click to unshare' : 'Share with client'}
                style={{ color: item.visible_to_client ? 'var(--text-success)' : undefined }}
              >
                <i className={`ti ${item.visible_to_client ? 'ti-eye' : 'ti-eye-off'}`} aria-hidden="true"></i>
              </button>
            )}
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
            {item.kind === 'invoice' && item.status !== 'paid' && remaining > 0 && (
              <button
                type="button"
                onClick={() => openApplyPayment(item)}
                disabled={busyId === item.id}
                className={adminStyles.iconBtn}
                title="Apply a payment"
                aria-label="Apply a payment"
              >
                <i className="ti ti-cash" aria-hidden="true"></i>
              </button>
            )}
            <button
              type="button"
              onClick={() => openEdit(item)}
              disabled={busyId === item.id}
              className={adminStyles.iconBtn}
              title="Edit entry"
              aria-label="Edit entry"
            >
              <i className="ti ti-pencil" aria-hidden="true"></i>
            </button>
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
          );
        })}
        {(!initialInvoices || initialInvoices.length === 0) && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No invoices or receipts yet.</p>
        )}
      </div>
      </>
      )}

      {!hideForm && (
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

        {form.kind === 'receipt' && (
          <div className={adminStyles.fieldGroup}>
            <label className={adminStyles.fieldLabel}>Date (optional — defaults to today)</label>
            <input
              className={adminStyles.fieldInput}
              type="date"
              name="paidDate"
              value={form.paidDate}
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
      )}

      {editingItem && (
        <Modal title="Edit entry" onClose={() => setEditingItem(null)} maxWidth={480}>
          <form onSubmit={handleEditSave}>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Description</label>
              <input
                className={adminStyles.fieldInput}
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Amount</label>
              <input
                className={adminStyles.fieldInput}
                type="number"
                step="0.01"
                min="0"
                value={editForm.amount}
                onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>{editingItem.kind === 'invoice' ? 'Due date' : 'Date'}</label>
              <input
                className={adminStyles.fieldInput}
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            {editError && <p className={adminStyles.formMsgError}>{editError}</p>}
            <div className={adminStyles.saveBar}>
              <button type="submit" className="btn-navy" disabled={editSaving || !editForm.amount}>
                {editSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {payingItem && (
        <Modal title={`Apply a payment — ${payingItem.description}`} onClose={() => setPayingItem(null)} maxWidth={480}>
          <form onSubmit={handleApplyPayment}>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Amount</label>
              <input
                className={adminStyles.fieldInput}
                type="number"
                step="0.01"
                min="0"
                value={payForm.amount}
                onChange={(e) => setPayForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Date</label>
              <input
                className={adminStyles.fieldInput}
                type="date"
                value={payForm.date}
                onChange={(e) => setPayForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className={adminStyles.fieldGroup}>
              <label className={adminStyles.fieldLabel}>Note (optional)</label>
              <input
                className={adminStyles.fieldInput}
                value={payForm.description}
                onChange={(e) => setPayForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. Check #1234"
              />
            </div>
            {payError && <p className={adminStyles.formMsgError}>{payError}</p>}
            <div className={adminStyles.saveBar}>
              <button type="submit" className="btn-navy" disabled={paySaving || !payForm.amount}>
                {paySaving ? 'Applying...' : 'Apply payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
