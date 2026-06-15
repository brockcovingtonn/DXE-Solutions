'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

export default function TemplateList({ templates, allProjects }) {
  const router = useRouter();

  const [applyingId, setApplyingId] = useState(null);
  const [selectedProject, setSelectedProject] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  function startApply(templateId) {
    setApplyingId(templateId);
    setMessage('');
  }

  function cancelApply() {
    setApplyingId(null);
  }

  async function handleApply(templateId) {
    const projectId = selectedProject[templateId];
    if (!projectId) {
      setMessage('Choose a project first.');
      return;
    }

    setBusyId(templateId);
    setMessage('');

    try {
      const res = await fetch('/api/admin/templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, projectId }),
      });

      if (!res.ok) throw new Error();

      setMessage('Applied — added to the project\'s Documents.');
      setApplyingId(null);
    } catch {
      setMessage('Could not apply template.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(templateId) {
    if (!confirm('Delete this template? This cannot be undone.')) return;

    setBusyId(templateId);
    try {
      await fetch(`/api/admin/templates/${templateId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!templates || templates.length === 0) {
    return (
      <p style={{ fontSize: '0.85rem', color: '#718096' }}>
        No templates yet. Add one using the form above.
      </p>
    );
  }

  return (
    <div>
      {templates.map((t) => (
        <div className={adminStyles.utilityEntryBlock} key={t.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
            <div>
              <div className={adminStyles.clientName}>{t.name}</div>
              <div className={adminStyles.clientEmail}>
                {[t.category, t.file_name].filter(Boolean).join(' · ')}
              </div>
              {t.description && (
                <p style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.4rem' }}>{t.description}</p>
              )}
            </div>
            <div className={adminStyles.utilityEntryActions}>
              <button
                type="button"
                className={adminStyles.iconBtn}
                onClick={() => startApply(t.id)}
                aria-label="Apply to project"
                title="Apply to project"
              >
                <i className="ti ti-file-export" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className={adminStyles.iconBtn}
                onClick={() => handleDelete(t.id)}
                disabled={busyId === t.id}
                aria-label="Delete template"
              >
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          {applyingId === t.id && (
            <div className={adminStyles.entryFormActions} style={{ marginTop: '0.75rem' }}>
              <select
                className={adminStyles.fieldInput}
                style={{ maxWidth: '300px' }}
                value={selectedProject[t.id] || ''}
                onChange={(e) => setSelectedProject((prev) => ({ ...prev, [t.id]: e.target.value }))}
              >
                <option value="">Select a project...</option>
                {(allProjects || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-navy"
                onClick={() => handleApply(t.id)}
                disabled={busyId === t.id}
              >
                {busyId === t.id ? 'Applying...' : 'Apply'}
              </button>
              <button type="button" className={adminStyles.cancelBtn} onClick={cancelApply}>
                Cancel
              </button>
            </div>
          )}
        </div>
      ))}

      {message && <p className={adminStyles.formMsgSuccess} style={{ marginTop: '0.75rem' }}>{message}</p>}
    </div>
  );
}
