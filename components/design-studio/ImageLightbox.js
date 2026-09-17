'use client';

import { useEffect } from 'react';
import styles from '@/components/portal-shared.module.css';

// Click-to-enlarge overlay for a single image — reuses the lightbox CSS
// already built for components/PhotoGrid.js (photos elsewhere in the app),
// minus the multi-photo prev/next stepping this doesn't need.
export default function ImageLightbox({ src, alt, downloadUrl, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.lightboxBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      {downloadUrl ? (
        <a
          href={downloadUrl}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '1.25rem', right: '4.5rem', color: '#fff', fontSize: '0.85rem',
            fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}
        >
          <i className="ti ti-download" aria-hidden="true"></i> Download
        </a>
      ) : null}
      <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Close">
        <i className="ti ti-x" aria-hidden="true"></i>
      </button>
      <img className={styles.lightboxImg} src={src} alt={alt || 'Floor plan'} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
