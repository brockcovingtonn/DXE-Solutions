'use client';

import { useState, useEffect, useCallback } from 'react';
import DownloadLink from '@/components/DownloadLink';
import styles from '@/components/portal-shared.module.css';

// Shared photo grid with contain-fit thumbnails and a click-to-enlarge
// lightbox. `showDownload` renders a per-tile download link (safe to use
// from a Server Component). `renderOverlay(photo)` lets a Client
// Component caller drop extra per-tile controls (delete / select).
export default function PhotoGrid({ photos, showDownload = false, renderOverlay }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const withUrl = (photos || []).filter((p) => p.url);

  const close = useCallback(() => setLightboxIndex(null), []);
  const step = useCallback(
    (dir) => {
      setLightboxIndex((i) => {
        if (i === null) return i;
        return (i + dir + withUrl.length) % withUrl.length;
      });
    },
    [withUrl.length]
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, close, step]);

  const active = lightboxIndex !== null ? withUrl[lightboxIndex] : null;

  return (
    <>
      <div className={styles.photosGrid}>
        {(photos || []).map((p) => {
          const idx = withUrl.indexOf(p);
          return (
            <div className={styles.photoItem} key={p.id}>
              {p.url ? (
                <button
                  type="button"
                  className={styles.photoTile}
                  onClick={() => setLightboxIndex(idx)}
                  aria-label={p.caption ? `Enlarge photo: ${p.caption}` : 'Enlarge photo'}
                >
                  <img className={styles.photoThumb} src={p.url} alt={p.caption || 'Project photo'} loading="lazy" />
                </button>
              ) : (
                <div className={styles.photoPlaceholder}>
                  <i className="ti ti-photo" aria-hidden="true"></i>
                  <span>Photo</span>
                </div>
              )}
              {p.caption && <div className={styles.photoTag}>{p.caption}</div>}
              {showDownload && p.url && (
                <DownloadLink
                  href={`/api/photos/${p.id}/download`}
                  title="Download"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '0.4rem',
                    right: '0.4rem',
                    background: 'rgba(62,84,104,0.85)',
                    color: 'var(--gold-light)',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <i className="ti ti-download" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
                </DownloadLink>
              )}
              {renderOverlay && renderOverlay(p)}
            </div>
          );
        })}
      </div>

      {active && (
        <div className={styles.lightboxBackdrop} onClick={close} role="dialog" aria-modal="true">
          <button type="button" className={styles.lightboxClose} onClick={close} aria-label="Close">
            <i className="ti ti-x" aria-hidden="true"></i>
          </button>
          {withUrl.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`}
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous photo"
              >
                <i className="ti ti-chevron-left" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className={`${styles.lightboxNav} ${styles.lightboxNavNext}`}
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next photo"
              >
                <i className="ti ti-chevron-right" aria-hidden="true"></i>
              </button>
            </>
          )}
          <img
            className={styles.lightboxImg}
            src={active.url}
            alt={active.caption || 'Project photo'}
            onClick={(e) => e.stopPropagation()}
          />
          {active.caption && <div className={styles.lightboxCaption}>{active.caption}</div>}
        </div>
      )}
    </>
  );
}
