'use client';

import { useMemo, useRef } from 'react';
import {
  computeFitTransform,
  worldToScreen,
  screenToWorld,
  furnitureCorners,
  snapToEndpoint,
  WALL_SNAP_THRESHOLD_METERS,
} from '@/lib/design-studio/floor-plan-geometry';
import {
  WALL_COLOR,
  DOOR_COLOR,
  WINDOW_COLOR,
  SELECTED_COLOR,
  elementEndpoints,
  DimensionChip,
  FurnitureItem,
} from './FloorPlanRenderer';

/**
 * Interactive floor-plan surface: select + drag existing walls/doors/
 * windows (whole-element move, or grab an endpoint to reshape) and
 * furniture (move). Drawing new walls / placing new furniture is Phase C.
 *
 * The fit-to-canvas transform is computed from `frozenElements`/
 * `frozenObjects` (a snapshot the parent only updates on drag-end/add/
 * delete/fit-to-view), NOT the live `elements`/`objects` — otherwise the
 * canvas would rescale/recenter under the cursor on every drag frame.
 */
export default function FloorPlanCanvas({
  elements,
  objects,
  frozenElements,
  frozenObjects,
  width,
  height,
  margin = 40,
  selectedId,
  onSelect,
  onDragElementBody,
  onDragEndpoint,
  onDragFurniture,
  onDragEnd,
}) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);

  const transform = useMemo(
    () => computeFitTransform(frozenElements, frozenObjects, width, height, margin),
    [frozenElements, frozenObjects, width, height, margin]
  );

  function pointerToScreen(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function beginDrag(e, drag) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const screen = pointerToScreen(e);
    const world = screenToWorld(transform, screen.x, screen.y);
    dragRef.current = { ...drag, pointerId: e.pointerId, startWorld: world };
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const screen = pointerToScreen(e);
    const world = screenToWorld(transform, screen.x, screen.y);
    const dx = world.x - drag.startWorld.x;
    const dz = world.z - drag.startWorld.z;

    if (drag.type === 'element-body') {
      onDragElementBody(
        drag.id,
        drag.originalStart.x + dx,
        drag.originalStart.z + dz,
        drag.originalEnd.x + dx,
        drag.originalEnd.z + dz
      );
    } else if (drag.type === 'endpoint') {
      let point = { x: world.x, z: world.z };
      const others = elements.filter((el) => el.id !== drag.id);
      const snapped = snapToEndpoint(point, others, WALL_SNAP_THRESHOLD_METERS);
      if (snapped) point = snapped;
      onDragEndpoint(drag.id, drag.which, point.x, point.z);
    } else if (drag.type === 'furniture') {
      onDragFurniture(drag.id, drag.originalCenter.x + dx, drag.originalCenter.z + dz);
    }
  }

  function handlePointerUp(e) {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current = null;
    onDragEnd();
  }

  function startElementBodyDrag(e, el) {
    onSelect(`element:${el.id}`);
    const { start, end } = elementEndpoints(el);
    beginDrag(e, { type: 'element-body', id: el.id, originalStart: start, originalEnd: end });
  }

  function startEndpointDrag(e, el, which) {
    onSelect(`element:${el.id}`);
    beginDrag(e, { type: 'endpoint', id: el.id, which });
  }

  function startFurnitureDrag(e, obj) {
    onSelect(`furniture:${obj.id}`);
    const center = { x: obj.centerX ?? obj.center_x ?? 0, z: obj.centerZ ?? obj.center_z ?? 0 };
    beginDrag(e, { type: 'furniture', id: obj.id, originalCenter: center });
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ touchAction: 'none', cursor: 'default' }}
      onPointerDown={() => onSelect(null)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />

      {elements.map((el) => {
        const { start, end } = elementEndpoints(el);
        const a = worldToScreen(transform, start.x, start.z);
        const b = worldToScreen(transform, end.x, end.z);
        const isSelected = selectedId === `element:${el.id}`;
        const type = el.type;
        const baseColor = type === 'door' ? DOOR_COLOR : type === 'window' ? WINDOW_COLOR : WALL_COLOR;
        const stroke = isSelected ? SELECTED_COLOR : baseColor;
        const strokeWidth = type === 'wall' ? 5 : 4;
        return (
          <g key={el.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Wide invisible hit target — the visible line is too thin to grab reliably. */}
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="transparent" strokeWidth={18} strokeLinecap="round"
              style={{ cursor: 'move' }}
              onPointerDown={(e) => startElementBodyDrag(e, el)}
            />
            {isSelected ? (
              <>
                <circle cx={a.x} cy={a.y} r={6} fill={SELECTED_COLOR} stroke="#fff" strokeWidth={1.5} style={{ cursor: 'grab' }} onPointerDown={(e) => startEndpointDrag(e, el, 'start')} />
                <circle cx={b.x} cy={b.y} r={6} fill={SELECTED_COLOR} stroke="#fff" strokeWidth={1.5} style={{ cursor: 'grab' }} onPointerDown={(e) => startEndpointDrag(e, el, 'end')} />
              </>
            ) : null}
          </g>
        );
      })}

      {elements.map((el) => {
        const { start, end } = elementEndpoints(el);
        const a = worldToScreen(transform, start.x, start.z);
        const b = worldToScreen(transform, end.x, end.z);
        const lengthFt = el.lengthFt ?? el.length_ft ?? 0;
        if (!lengthFt) return null;
        return <DimensionChip key={`dim-${el.id}`} a={a} b={b} lengthFt={lengthFt} />;
      })}

      {objects.map((obj) => {
        const isSelected = selectedId === `furniture:${obj.id}`;
        const corners = furnitureCorners(obj).map((c) => worldToScreen(transform, c.x, c.z));
        return (
          <g key={obj.id} style={{ cursor: 'move' }} onPointerDown={(e) => startFurnitureDrag(e, obj)}>
            <FurnitureItem object={obj} transform={transform} />
            {isSelected ? (
              <polygon
                points={corners.map((c) => `${c.x},${c.y}`).join(' ')}
                fill="none"
                stroke={SELECTED_COLOR}
                strokeWidth={2}
                strokeDasharray="5 3"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
