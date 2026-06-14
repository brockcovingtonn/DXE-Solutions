'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';

const BADGE_CLASS = {
  new: styles.badgeNew,
  signed: styles.badgeSigned,
  pending: styles.badgePending,
};

export default function AdminDocuments({ projectId, initialDocs }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');

    try {
      for (const file of files) {
        const filePath = `${projectId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const res = await fetch('/api/admin/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            fileName: file.name,
            filePath,
            fileType: file.name.split('.').pop(),
            badge: 'new',
          }),
        });

        if (!res.ok) throw new Error();
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleBadgeChange(docId, badge) {
    setSavingId(docId);
    try {
      await fetch(`/api/admin/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge }),
      });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(docId) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    setSavingId(docId);
    try {
      await fetch(`/api/admin/documents/${docId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div className={styles.docList}>
        {initialDocs.map((d) => (
          <div className={styles.docItem} key={d.id}>
            <div className={styles.docIcon}>
              <i className="ti ti-file-text" aria-hidden="true"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div className={styles.docName}>{d.file_name}</div>
              <div className={styles.docMeta}>
                {formatDate(d.created_at)} · Uploaded by {d.uploaded_by_role === 'dxe' ? 'DXE' : 'Client'}
              </div>
            </div>
            <select
              value={d.badge}
              onChange={(e) => handleBadgeChange(d.id, e.target.value)}
              disabled={savingId === d.id}
              style={{
                border: '1px solid rgba(11,31,58,0.12)',
                background: 'var(--cream)',
                color: 'var(--navy)',
                padding: '0.3rem 0.5rem',
                fontSize: '0.75rem',
                fontFamily: 'Inter, sans-serif',
                outline: 'none',
                marginLeft: '0.5rem',
              }}
            >
              <option value="new">New</option>
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
            </select>
            <button
              type="button"
              className={adminStyles.iconBtn}
              onClick={() => handleDelete(d.id)}
              disabled={savingId === d.id}
              aria-label="Delete document"
              style={{ marginLeft: '0.25rem' }}
            >
              <i className="ti ti-trash" aria-hidden="true"></i>
            </button>
          </div>
        ))}
        {initialDocs.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: '#718096' }}>No documents yet.</p>
        )}
      </div>

      <label
        className={styles.uploadZone}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{ marginTop: '1rem' }}
      >
        <i className="ti ti-upload" aria-hidden="true"></i>
        <p>
          {uploading ? (
            'Uploading...'
          ) : (
            <>
              <strong>Click to upload</strong> or drag and drop a document for this client
            </>
          )}
        </p>
        <p style={{ fontSize: '0.72rem', marginTop: '0.3rem' }}>PDF, DOCX, DWG, XLSX — max 50MB</p>
        <input ref={fileInputRef} type="file" multiple disabled={uploading} onChange={(e) => handleFiles(e.target.files)} />
      </label>
      {error && <p style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.75rem' }}>{error}</p>}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
