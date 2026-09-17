'use client';

import { useEffect } from 'react';
import styles from '@/components/portal-shared.module.css';
import { C } from '@/lib/design-studio/brand';

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
      <div style={{ width: '100%', maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 8, letterSpacing: '0.02em' }}>
          3D Floor Plan
        </div>
        <div
          style={{
            width: '100%',
            height: '65vh',
            borderRadius: 8,
            overflow: 'hidden',
            // Hatch pattern behind the model, like a CAD viewport, so the
            // walls read clearly against the background instead of a flat
            // fill. model-viewer's own canvas is transparent when no
            // skybox/environment image is set, so this shows through.
            backgroundColor: C.sand,
            backgroundImage: `repeating-linear-gradient(45deg, rgba(62,84,104,0.08) 0, rgba(62,84,104,0.08) 1px, transparent 1px, transparent 10px)`,
          }}
        >
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
    </div>
  );
}
