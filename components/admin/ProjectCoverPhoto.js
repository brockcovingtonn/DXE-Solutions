'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import styles from '@/components/portal-shared.module.css';

export default function ProjectCoverPhoto({ projectId, coverPhotoUrl }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      const filePath = `${projectId}/cover-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('project-photos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_photo_path: filePath }),
      });
      if (!res.ok) throw new Error();

      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove() {
    if (!confirm('Remove this photo?')) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_photo_path: null }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError('Could not remove this photo.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  }

  if (coverPhotoUrl) {
    return (
      <div style={{ position: 'relative', marginTop: '1rem', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <img
          src={coverPhotoUrl}
          alt="Project cover"
          style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '2.75rem',
            background: 'rgba(62,84,104,0.85)',
            border: 'none',
            color: '#fff',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
          aria-label="Replace photo"
          title="Replace photo"
        >
          <i className="ti ti-replace" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={uploading}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'rgba(62,84,104,0.85)',
            border: 'none',
            color: '#fca5a5',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
          aria-label="Remove photo"
          title="Remove photo"
        >
          <i className="ti ti-trash" aria-hidden="true"></i>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
        {error && <p style={{ fontSize: '0.78rem', color: 'var(--text-error)', marginTop: '0.5rem' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <label
        className={styles.uploadZone}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      >
        <i className="ti ti-photo-plus" aria-hidden="true"></i>
        <p>{uploading ? 'Uploading...' : <><strong>Click to upload</strong> or drag and drop a project photo</>}</p>
        <p style={{ fontSize: '0.72rem', marginTop: '0.3rem' }}>JPG, PNG</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && <p style={{ fontSize: '0.78rem', color: 'var(--text-error)', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
