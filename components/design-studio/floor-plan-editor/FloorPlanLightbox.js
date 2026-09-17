'use client';

import { useEffect } from 'react';
import styles from '@/components/portal-shared.module.css';
import FloorPlanView from './FloorPlanView';

// Full-screen zoom for the live-vector floor plan — same backdrop/close
// pattern as ImageLightbox, but sizes a FloorPlanView instead of an <img>
// since there's no single raster file to display once elements/objects
// are the source of truth.
export default function FloorPlanLightbox({ elements, objects, fallbackImageUrl, alt, downloadUrl, onClose }) {
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
          style={{ position: 'absolute', top: '1.25rem', right: '4.5rem', color: '#fff', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <i className="ti ti-download" aria-hidden="true"></i> Download
        </a>
      ) : null}
      <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Close">
        <i className="ti ti-x" aria-hidden="true"></i>
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(90vw, 900px)', height: 'min(80vh, 900px)', background: '#fff', borderRadius: 8, boxShadow: '0 12px 48px rgba(0,0,0,0.5)', overflow: 'hidden' }}
      >
        <FloorPlanView elements={elements} objects={objects} fallbackImageUrl={fallbackImageUrl} alt={alt} margin={48} />
      </div>
    </div>
  );
}
