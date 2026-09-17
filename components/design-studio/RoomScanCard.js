'use client';

import { useState } from 'react';
import { C } from '@/lib/design-studio/brand';
import ModelLightbox from './ModelLightbox';

// A room scan on the client-facing proposal: the 2D floor plan and a small
// interactive 3D view shown side by side (not a toggle) — kept modest in
// size since these are supporting visuals, not the main proposal content.
// The 3D view expands to a full-size lightbox on click. Only the 2D floor
// plan is downloadable; a scan with no glTF export just shows the 2D side.
export default function RoomScanCard({ scan }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
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
            <div
              style={{
                flex: hasBoth ? '1 1 50%' : '1 1 100%', minWidth: 150, position: 'relative',
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(62,84,104,0.08) 0, rgba(62,84,104,0.08) 1px, transparent 1px, transparent 10px)',
              }}
            >
              <model-viewer
                src={scan.modelGltfUrl}
                ios-src={scan.modelUrl || undefined}
                alt={scan.roomLabel || 'Room scan'}
                camera-controls
                auto-rotate
                ar
                style={{ width: '100%', height: 180, display: 'block', '--poster-color': 'transparent' }}
              />
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Expand 3D view"
                style={{
                  position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 6,
                  background: 'rgba(20,28,36,0.65)', border: 'none', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}
              >
                ⤢
              </button>
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
      </div>

      {lightboxOpen ? (
        <ModelLightbox
          modelGltfUrl={scan.modelGltfUrl}
          modelUrl={scan.modelUrl}
          alt={scan.roomLabel || 'Room scan'}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
}
