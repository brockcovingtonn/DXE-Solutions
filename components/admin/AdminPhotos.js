'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';

export default function AdminPhotos({ projectId, initialPhotos }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [caption, setCaption] = useState('');
  const [deletingId, setDeletingId] = useState(null);

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
      <div className={styles.photosGrid}>
        {initialPhotos.map((p) => (
          <div
            className={styles.photoItem}
            key={p.id}
            style={{
              backgroundImage: p.url ? `url(${p.url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              background: p.url ? undefined : 'var(--navy-mid)',
            }}
          >
            {!p.url && (
              <div className={styles.photoPlaceholder}>
                <i className="ti ti-photo" aria-hidden="true"></i>
                <span>Photo</span>
              </div>
            )}
            {p.caption && <div className={styles.photoTag}>{p.caption}</div>}
            <button
              type="button"
              onClick={() => handleDelete(p.id)}
              disabled={deletingId === p.id}
              aria-label="Delete photo"
              style={{
                position: 'absolute',
                top: '0.4rem',
                right: '0.4rem',
                background: 'rgba(11,31,58,0.8)',
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
          </div>
        ))}
        {initialPhotos.length === 0 && (
          <div className={styles.emptyState}>
            <i className="ti ti-photo-off" aria-hidden="true"></i>
            <p>No photos uploaded yet for this project.</p>
          </div>
        )}
      </div>

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
      {error && <p style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.75rem' }}>{error}</p>}
    </div>
  );
}
