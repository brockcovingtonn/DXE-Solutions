'use client';

import { C } from '@/lib/design-studio/brand';

// A room scan on the client-facing proposal: the 2D floor plan and a small
// interactive 3D view shown side by side (not a toggle) — kept modest in
// size since these are supporting visuals, not the main proposal content.
// Falls back to a plain AR/download link on older scans with no glTF export.
export default function RoomScanCard({ scan }) {
  const hasBoth = Boolean(scan.modelGltfUrl && scan.floorPlanUrl);

  return (
    <div style={{ background: C.sand, borderRadius: 8, overflow: 'hidden' }}>
      {scan.floorPlanUrl || scan.modelGltfUrl ? (
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {scan.floorPlanUrl ? (
            <div style={{ flex: hasBoth ? '1 1 50%' : '1 1 100%', minWidth: 150 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scan.floorPlanUrl}
                alt={scan.roomLabel || 'Floor plan'}
                style={{ width: '100%', height: 180, objectFit: 'contain', background: '#fff', display: 'block' }}
              />
            </div>
          ) : null}
          {scan.modelGltfUrl ? (
            <div style={{ flex: hasBoth ? '1 1 50%' : '1 1 100%', minWidth: 150 }}>
              <model-viewer
                src={scan.modelGltfUrl}
                ios-src={scan.modelUrl || undefined}
                alt={scan.roomLabel || 'Room scan'}
                camera-controls
                auto-rotate
                ar
                style={{ width: '100%', height: 180, display: 'block', '--poster-color': 'transparent' }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{scan.roomLabel || 'Scanned space'}</div>
        {scan.areaSqft ? (
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
            Measured {Number(scan.areaSqft).toLocaleString()} sf via LiDAR scan
          </div>
        ) : null}
        {!scan.modelGltfUrl && scan.modelUrl ? (
          <a href={scan.modelUrl} rel="ar" style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, fontWeight: 600, color: C.clay, textDecoration: 'none' }}>
            View in 3D / AR →
          </a>
        ) : null}
      </div>
    </div>
  );
}
