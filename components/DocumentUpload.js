'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import styles from '@/components/portal-shared.module.css';

export default function DocumentUpload({ projectId }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');

    try {
      for (const file of files) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const filePath = `${projectId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from('documents').insert({
          project_id: projectId,
          uploaded_by: user.id,
          uploaded_by_role: 'client',
          file_name: file.name,
          file_path: filePath,
          file_type: file.name.split('.').pop(),
          badge: 'new',
        });

        if (dbError) throw dbError;
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again or contact Dixie directly.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className={styles.fullWidthCard}>
      <h3>Upload a Document</h3>
      <p style={{ fontSize: '0.82rem', color: '#718096', marginBottom: '1rem' }}>
        Share contracts, insurance certificates, authorizations, or any file relevant to your
        project.
      </p>
      <label
        className={styles.uploadZone}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <i className="ti ti-upload" aria-hidden="true"></i>
        <p>
          {uploading ? (
            'Uploading...'
          ) : (
            <>
              <strong>Click to upload</strong> or drag and drop
            </>
          )}
        </p>
        <p style={{ fontSize: '0.72rem', marginTop: '0.3rem' }}>
          PDF, DOCX, DWG, XLSX — max 50MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && (
        <p style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.75rem' }}>{error}</p>
      )}
    </div>
  );
}
