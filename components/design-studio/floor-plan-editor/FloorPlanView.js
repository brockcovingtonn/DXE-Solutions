'use client';

import { useEffect, useRef, useState } from 'react';
import FloorPlanRenderer from './FloorPlanRenderer';

/**
 * Read-only, responsive live-vector floor plan — the replacement for the
 * old `<img src={scan.floorPlanUrl}>`. Fills whatever box the caller gives
 * it (set width/height or aspect-ratio via `style`/`className` on the
 * parent) and measures itself via ResizeObserver.
 *
 * Scans captured before the position-data groundwork pass have empty
 * `elements`/`objects` but still have a perfectly good capture-time PNG —
 * for those, fall back to `fallbackImageUrl` (the raster) instead of
 * showing an empty plan, so older data doesn't regress.
 */
export default function FloorPlanView({ elements, objects, fallbackImageUrl, alt, style, className, margin = 32 }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const hasLiveData = (elements && elements.length > 0) || (objects && objects.length > 0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!hasLiveData && fallbackImageUrl) {
    return (
      <div className={className} style={{ width: '100%', height: '100%', ...style }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fallbackImageUrl} alt={alt || 'Floor plan'} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
      {size.width > 0 && size.height > 0 ? (
        <FloorPlanRenderer elements={elements} objects={objects} width={size.width} height={size.height} margin={margin} />
      ) : null}
    </div>
  );
}
