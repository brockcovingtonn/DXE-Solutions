'use client';

import { computeFitTransform, worldToScreen } from '@/lib/design-studio/floor-plan-geometry';
import { symbolForObject } from '@/lib/design-studio/furniture-symbols';
import { C } from '@/lib/design-studio/brand';

export const WALL_COLOR = '#2C3E50';
export const DOOR_COLOR = '#C9A857';
export const WINDOW_COLOR = 'rgba(62, 84, 104, 0.55)';
export const FURNITURE_STROKE = 'rgba(201, 168, 87, 0.85)';
export const FURNITURE_FILL = 'rgba(201, 168, 87, 0.16)';
export const SELECTED_COLOR = '#A9793A';

export function elementEndpoints(el) {
  return {
    start: { x: el.startX ?? el.start_x ?? 0, z: el.startZ ?? el.start_z ?? 0 },
    end: { x: el.endX ?? el.end_x ?? 0, z: el.endZ ?? el.end_z ?? 0 },
  };
}

export function DimensionChip({ a, b, lengthFt }) {
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;
  const text = `${lengthFt.toFixed(1)} ft`;
  const chipWidth = text.length * 5.6 + 10;
  return (
    <g transform={`translate(${midX} ${midY}) rotate(${angle})`}>
      <rect x={-chipWidth / 2} y={-16} width={chipWidth} height={14} rx={3} fill="rgba(255,255,255,0.88)" />
      <text x={0} y={-6} textAnchor="middle" fontSize={10} fontWeight={600} fill={WALL_COLOR}>
        {text}
      </text>
    </g>
  );
}

function FurniturePart({ part, halfWPx, halfDPx }) {
  switch (part.type) {
    case 'rect': {
      const w = part.w * halfWPx;
      const h = part.h * halfDPx;
      const rx = part.rx ? part.rx * Math.min(halfWPx, halfDPx) : 0;
      return (
        <rect
          x={part.x * halfWPx - w / 2}
          y={part.z * halfDPx - h / 2}
          width={w}
          height={h}
          rx={rx}
        />
      );
    }
    case 'circle':
      return <ellipse cx={part.x * halfWPx} cy={part.z * halfDPx} rx={part.r * halfWPx} ry={part.r * halfDPx} />;
    case 'ellipse':
      return <ellipse cx={part.x * halfWPx} cy={part.z * halfDPx} rx={part.rx * halfWPx} ry={part.rz * halfDPx} />;
    case 'line':
      return (
        <line x1={part.x1 * halfWPx} y1={part.z1 * halfDPx} x2={part.x2 * halfWPx} y2={part.z2 * halfDPx} strokeWidth={1.2} />
      );
    case 'dots':
      return (
        <>
          {part.points.map(([fx, fz], i) => (
            <circle key={i} cx={fx * halfWPx} cy={fz * halfDPx} r={part.r * Math.min(halfWPx, halfDPx)} fill={FURNITURE_STROKE} stroke="none" />
          ))}
        </>
      );
    default:
      return null;
  }
}

export function FurnitureItem({ object, transform }) {
  const symbol = symbolForObject(object);
  if (!symbol) return null;
  const widthM = object.widthMeters ?? object.width_m ?? symbol.defaultWidthM;
  const depthM = object.depthMeters ?? object.depth_m ?? symbol.defaultDepthM;
  const centerX = object.centerX ?? object.center_x ?? 0;
  const centerZ = object.centerZ ?? object.center_z ?? 0;
  const rotationRadians = object.rotationRadians ?? object.rotation_radians ?? 0;
  const center = worldToScreen(transform, centerX, centerZ);
  const halfWPx = (widthM / 2) * transform.scale;
  const halfDPx = (depthM / 2) * transform.scale;
  const angleDeg = (rotationRadians * 180) / Math.PI;
  const label = object.label || symbol.label;

  return (
    <g>
      <g
        transform={`translate(${center.x} ${center.y}) rotate(${angleDeg})`}
        fill={symbol.unfilled ? 'none' : FURNITURE_FILL}
        stroke={FURNITURE_STROKE}
        strokeWidth={1.4}
        strokeDasharray={symbol.dashed ? '4 3' : undefined}
      >
        {symbol.parts.map((part, i) => (
          <FurniturePart key={i} part={part} halfWPx={halfWPx} halfDPx={halfDPx} />
        ))}
      </g>
      <text
        x={center.x}
        y={symbol.labelOutside ? center.y + halfDPx + 12 : center.y}
        textAnchor="middle"
        dominantBaseline={symbol.labelOutside ? undefined : 'middle'}
        fontSize={10}
        fontWeight={500}
        fill={WALL_COLOR}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Renders a scan's elements/objects as a live SVG floor plan. Read-only —
 * the interactive editor wraps this same rendering (or a close variant of
 * it) with pointer handlers layered on top, so viewing and editing can
 * never visually drift apart.
 */
export default function FloorPlanRenderer({ elements = [], objects = [], width, height, margin = 40, showDimensions = true }) {
  const transform = computeFitTransform(elements, objects, width, height, margin);

  if (!elements.length && !objects.length) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={12} fill={C.muted}>
          No floor plan data yet.
        </text>
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
      {elements.map((el) => {
        const { start, end } = elementEndpoints(el);
        const a = worldToScreen(transform, start.x, start.z);
        const b = worldToScreen(transform, end.x, end.z);
        const type = el.type;
        const stroke = type === 'door' ? DOOR_COLOR : type === 'window' ? WINDOW_COLOR : WALL_COLOR;
        const strokeWidth = type === 'wall' ? 5 : 4;
        return (
          <line key={el.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        );
      })}
      {showDimensions &&
        elements.map((el) => {
          const { start, end } = elementEndpoints(el);
          const a = worldToScreen(transform, start.x, start.z);
          const b = worldToScreen(transform, end.x, end.z);
          const lengthFt = el.lengthFt ?? el.length_ft ?? 0;
          if (!lengthFt) return null;
          return <DimensionChip key={`dim-${el.id}`} a={a} b={b} lengthFt={lengthFt} />;
        })}
      {objects.map((obj) => (
        <FurnitureItem key={obj.id} object={obj} transform={transform} />
      ))}
    </svg>
  );
}
