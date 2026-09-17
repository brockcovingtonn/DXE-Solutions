'use client';

import { FURNITURE_CATEGORIES } from '@/lib/design-studio/furniture-symbols';
import { C } from '@/lib/design-studio/brand';

const ICON_SIZE = 34;
const HALF = ICON_SIZE / 2 - 4;

function PaletteIcon({ category }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}>
      <g
        transform={`translate(${ICON_SIZE / 2} ${ICON_SIZE / 2})`}
        fill={category.unfilled ? 'none' : 'rgba(201, 168, 87, 0.2)'}
        stroke="rgba(169, 121, 58, 0.9)"
        strokeWidth={1.2}
        strokeDasharray={category.dashed ? '3 2' : undefined}
      >
        {category.parts.map((part, i) => {
          switch (part.type) {
            case 'rect': {
              const w = part.w * HALF;
              const h = part.h * HALF;
              return <rect key={i} x={part.x * HALF - w / 2} y={part.z * HALF - h / 2} width={w} height={h} rx={part.rx ? part.rx * HALF : 0} />;
            }
            case 'circle':
              return <ellipse key={i} cx={part.x * HALF} cy={part.z * HALF} rx={part.r * HALF} ry={part.r * HALF} />;
            case 'ellipse':
              return <ellipse key={i} cx={part.x * HALF} cy={part.z * HALF} rx={part.rx * HALF} ry={part.rz * HALF} />;
            case 'line':
              return <line key={i} x1={part.x1 * HALF} y1={part.z1 * HALF} x2={part.x2 * HALF} y2={part.z2 * HALF} strokeWidth={1} />;
            case 'dots':
              return (
                <g key={i}>
                  {part.points.map(([fx, fz], j) => (
                    <circle key={j} cx={fx * HALF} cy={fz * HALF} r={part.r * HALF} fill="rgba(169, 121, 58, 0.9)" stroke="none" />
                  ))}
                </g>
              );
            default:
              return null;
          }
        })}
      </g>
    </svg>
  );
}

/**
 * Sidebar of placeable furniture categories. Clicking one arms
 * "place-furniture" mode with that category; the editor stays armed
 * after each placement so several of the same item (e.g. 4 chairs) can
 * be dropped in a row, until another tool/category is chosen.
 */
export default function FurniturePalette({ armedKey, onArm }) {
  return (
    <div style={{ width: 220, flexShrink: 0, border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', overflow: 'auto' }}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.line}`, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted }}>
        Furniture
      </div>
      <div>
        {FURNITURE_CATEGORIES.map((cat) => {
          const isArmed = armedKey === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onArm(isArmed ? null : cat.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px',
                background: isArmed ? 'rgba(201, 168, 87, 0.14)' : 'none', border: 'none', borderBottom: `1px solid ${C.line}`,
                cursor: 'pointer', textAlign: 'left', fontSize: 13, color: C.ink, fontWeight: isArmed ? 600 : 400,
              }}
            >
              <PaletteIcon category={cat} />
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
