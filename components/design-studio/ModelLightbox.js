'use client';

import { useEffect } from 'react';
import styles from '@/components/portal-shared.module.css';

// Click-to-enlarge overlay for a 3D room scan — mirrors ImageLightbox.js,
// but renders a bigger <model-viewer> instead of an <img>. Needs the
// <model-viewer> script already loaded by the page (ScanManager.js /
// ProposalDocument.js both load it via next/script).
export default function ModelLightbox({ modelGltfUrl, modelUrl, alt, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.lightboxBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Close">
        <i className="ti ti-x" aria-hidden="true"></i>
      </button>
      <div style={{ width: '100%', maxWidth: 720, height: '70vh' }} onClick={(e) => e.stopPropagation()}>
        <model-viewer
          src={modelGltfUrl}
          ios-src={modelUrl || undefined}
          alt={alt || 'Room scan'}
          camera-controls
          auto-rotate
          ar
          style={{ width: '100%', height: '100%', display: 'block', '--poster-color': 'transparent' }}
        />
      </div>
    </div>
  );
}
