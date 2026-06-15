'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';

export default function TemplateUpload() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ name: '', description: '', category: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!form.name) {
      setForm((prev) => ({ ...prev, name: f.name.replace(/\.[^/.]+$/, '') }));
    }
  }

  async function handleUpload() {
    if (!file || !form.name) {
      setError('Please choose a file and give it a name.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const filePath = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('document-templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          filePath,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      if (!res.ok) throw new Error();

      setForm({ name: '', description: '', category: '' });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Template name</label>
          <input
            className={adminStyles.fieldInput}
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Standard Scope of Work"
          />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Category (optional)</label>
          <input
            className={adminStyles.fieldInput}
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="e.g. Permitting, Inspections"
          />
        </div>
      </div>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Description (optional)</label>
        <textarea
          className={adminStyles.fieldTextarea}
          name="description"
          value={form.description}
          onChange={handleChange}
        />
      </div>

      <label className={styles.uploadZone} style={{ marginTop: '0.5rem' }}>
        <i className="ti ti-upload" aria-hidden="true"></i>
        <p>
          {file ? (
            <strong>{file.name}</strong>
          ) : (
            <>
              <strong>Click to choose a file</strong> to use as a template
            </>
          )}
        </p>
        <p style={{ fontSize: '0.72rem', marginTop: '0.3rem' }}>PDF, DOCX, DWG, XLSX — max 50MB</p>
        <input ref={fileInputRef} type="file" disabled={uploading} onChange={handleFileSelect} />
      </label>

      {error && <p className={adminStyles.formMsgError}>{error}</p>}

      <div className={adminStyles.saveBar}>
        <button type="button" className="btn-navy" onClick={handleUpload} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Add template'}
        </button>
      </div>
    </div>
  );
}
