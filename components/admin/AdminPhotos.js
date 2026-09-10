'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import EmptyState from '@/components/EmptyState';
import PhotoGrid from '@/components/PhotoGrid';

export default function AdminPhotos({ projectId, initialPhotos }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [caption, setCaption] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} photo${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`)) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/admin/photos/${id}`, { method: 'DELETE' })));
      clearSelection();
      router.refresh();
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');

    try {
      const fileArr = Array.from(files);
      for (const file of fileArr) {
        const filePath = `${projectId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('project-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const res = await fetch('/api/admin/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            filePath,
            caption: caption || null,
            logActivity: file === fileArr[fileArr.length - 1],
            photoCount: fileArr.length,
          }),
        });

        if (!res.ok) throw new Error();
      }

      setCaption('');
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(photoId) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setDeletingId(photoId);
    try {
      await fetch(`/api/admin/photos/${photoId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      {selectedIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.6rem 0.85rem',
            background: 'var(--surface)',
            border: '1px solid rgba(var(--border-rgb),0.15)',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.82rem', color: 'var(--navy)', fontWeight: 500 }}>
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            style={{ background: 'none', border: '1px solid var(--text-error)', color: 'var(--text-error)', padding: '0.4rem 0.9rem', fontSize: '0.78rem', cursor: 'pointer' }}
          >
            {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}
          >
            Clear selection
          </button>
        </div>
      )}
      {initialPhotos.length === 0 ? (
        <EmptyState icon="ti-photo-off" title="No photos yet" subtitle="Upload progress photos below to share them with the client." />
      ) : (
        <PhotoGrid
          photos={initialPhotos}
          renderOverlay={(p) =>
            p.url ? (
              <>
                <a
                  href={`/api/photos/${p.id}/download`}
                  title="Download"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '0.4rem',
                    left: '0.4rem',
                    background: 'rgba(62,84,104,0.85)',
                    color: 'var(--gold-light)',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="ti ti-download" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  aria-label="Delete photo"
                  style={{
                    position: 'absolute',
                    top: '0.4rem',
                    right: '0.4rem',
                    background: 'rgba(62,84,104,0.85)',
                    border: 'none',
                    color: '#fca5a5',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <i className="ti ti-trash" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
                </button>
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleSelected(p.id)}
                  aria-label="Select photo"
                  style={{
                    position: 'absolute',
                    bottom: '0.4rem',
                    right: '0.4rem',
                    width: '18px',
                    height: '18px',
                    accentColor: 'var(--gold)',
                    zIndex: 2,
                  }}
                />
              </>
            ) : null
          }
        />
      )}

      <div style={{ marginTop: '1rem' }}>
        <label className={adminStyles.fieldLabel}>Caption (applies to this upload)</label>
        <input
          className={adminStyles.fieldInput}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="e.g. Framing — Week 8"
          style={{ marginBottom: '0.5rem' }}
        />
      </div>

      <label className={styles.uploadZone} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        <i className="ti ti-upload" aria-hidden="true"></i>
        <p>
          {uploading ? (
            'Uploading...'
          ) : (
            <>
              <strong>Click to upload</strong> or drag and drop photos
            </>
          )}
        </p>
        <p style={{ fontSize: '0.72rem', marginTop: '0.3rem' }}>JPG, PNG — multiple files supported</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && <p style={{ fontSize: '0.8rem', color: 'var(--text-error)', marginTop: '0.75rem' }}>{error}</p>}
    </div>
  );
}
