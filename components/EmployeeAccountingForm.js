'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import adminStyles from '@/components/admin.module.css';

const emptyForm = { projectId: '', kind: 'reimbursement', description: '', amount: '' };

export default function EmployeeAccountingForm({ projects }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.projectId || !form.description.trim() || !form.amount) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      let filePath = null;
      let fileName = null;

      if (file) {
        filePath = `${form.projectId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('project-invoices').upload(filePath, file);
        if (uploadError) throw uploadError;
        fileName = file.name;
      }

      const res = await fetch('/api/employee/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: form.projectId,
          kind: form.kind,
          description: form.description,
          amount: Number(form.amount),
          filePath,
          fileName,
        }),
      });

      if (!res.ok) throw new Error();

      setForm(emptyForm);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess(true);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Could not submit this entry.');
    } finally {
      setSaving(false);
    }
  }

  if (!projects || projects.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>You need to be assigned to a project to submit an entry.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Project</label>
          <select className={adminStyles.fieldInput} name="projectId" value={form.projectId} onChange={handleChange}>
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Type</label>
          <select className={adminStyles.fieldInput} name="kind" value={form.kind} onChange={handleChange}>
            <option value="reimbursement">Reimbursement (pay me back)</option>
            <option value="receipt">Receipt (project expense)</option>
          </select>
        </div>
      </div>

      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Amount</label>
          <input
            className={adminStyles.fieldInput}
            type="number"
            step="0.01"
            min="0"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Receipt (optional)</label>
          <input ref={fileInputRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Description</label>
        <input
          className={adminStyles.fieldInput}
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="e.g. Gas for site visits, or a city fee paid at the counter"
        />
      </div>

      {error && <p className={adminStyles.formMsgError}>{error}</p>}
      {success && <p className={adminStyles.formMsgSuccess}>Submitted — awaiting admin approval.</p>}

      <div className={adminStyles.saveBar}>
        <button type="submit" className="btn-navy" disabled={saving || !form.projectId || !form.description.trim() || !form.amount}>
          {saving ? 'Submitting...' : 'Submit for approval'}
        </button>
      </div>
    </form>
  );
}
