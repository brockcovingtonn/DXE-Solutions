'use client';

import { useState } from 'react';
import { C } from '@/lib/design-studio/brand';

// A room scan on the client-facing proposal: 3D view (via <model-viewer>,
// falling back to a plain AR/download link on older scans with no glTF
// export) with a 2D floor plan option right alongside it.
export default function RoomScanCard({ scan }) {
  const [mode, setMode] = useState(scan.modelGltfUrl ? '3d' : '2d');
  const hasBoth = Boolean(scan.modelGltfUrl && scan.floorPlanUrl);

  return (
    <div style={{ background: C.sand, borderRadius: 8, overflow: 'hidden' }}>
      {mode === '3d' && scan.modelGltfUrl ? (
        <model-viewer
          src={scan.modelGltfUrl}
          ios-src={scan.modelUrl || undefined}
          alt={scan.roomLabel || 'Room scan'}
          camera-controls
          auto-rotate
          ar
          style={{ width: '100%', height: 220, display: 'block', '--poster-color': 'transparent' }}
        />
      ) : scan.floorPlanUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={scan.floorPlanUrl} alt={scan.roomLabel || 'Floor plan'} style={{ width: '100%', display: 'block' }} />
      ) : null}

      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{scan.roomLabel || 'Scanned space'}</div>
        {scan.areaSqft ? (
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
            Measured {Number(scan.areaSqft).toLocaleString()} sf via LiDAR scan
          </div>
        ) : null}

        {hasBoth ? (
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setMode('3d')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                color: mode === '3d' ? C.clay : C.muted, textDecoration: mode === '3d' ? 'underline' : 'none',
              }}
            >
              3D view
            </button>
            <button
              type="button"
              onClick={() => setMode('2d')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                color: mode === '2d' ? C.clay : C.muted, textDecoration: mode === '2d' ? 'underline' : 'none',
              }}
            >
              2D floor plan
            </button>
          </div>
        ) : !scan.modelGltfUrl && scan.modelUrl ? (
          <a href={scan.modelUrl} rel="ar" style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, fontWeight: 600, color: C.clay, textDecoration: 'none' }}>
            View in 3D / AR →
          </a>
        ) : null}
      </div>
    </div>
  );
}
