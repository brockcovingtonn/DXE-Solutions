'use client';

import { useMemo, useRef, useState } from 'react';
import {
  computeFitTransform,
  worldToScreen,
  screenToWorld,
  furnitureCorners,
  snapToEndpoint,
  snapToGrid,
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
 * Interactive floor-plan surface.
 *
 * mode 'select': grab a wall/door/window body to translate it, grab a
 * selected wall's endpoint to reshape it, grab furniture to move it.
 *
 * mode 'draw-wall': click to place the first point (snap-checked), click
 * again to commit a wall to that point and stay armed for the next
 * segment (drawing a connected run). Existing elements' drag handlers are
 * disabled in this mode so a click on top of one still places a draft
 * point (snapping to its endpoint) rather than dragging it.
 *
 * mode 'place-furniture': click anywhere to drop the armed category at
 * that point; stays armed for placing several in a row.
 *
 * The fit-to-canvas transform is computed from `frozenElements`/
 * `frozenObjects` (a snapshot the parent only updates on drag-end/add/
 * delete/fit-to-view), NOT the live `elements`/`objects` — otherwise the
 * canvas would rescale/recenter under the cursor mid-drag.
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
  mode = 'select',
  draftWallStart,
  snapGridEnabled,
  onCanvasClick,
}) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const [hoverWorld, setHoverWorld] = useState(null);

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

  function resolvePlacementPoint(worldPoint) {
    const snapped = snapToEndpoint(worldPoint, elements, WALL_SNAP_THRESHOLD_METERS);
    if (snapped) return { point: snapped, snapped: true };
    if (snapGridEnabled) return { point: snapToGrid(worldPoint), snapped: false };
    return { point: worldPoint, snapped: false };
  }

  function beginDrag(e, drag) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const screen = pointerToScreen(e);
    const world = screenToWorld(transform, screen.x, screen.y);
    dragRef.current = { ...drag, pointerId: e.pointerId, startWorld: world };
  }

  function handlePointerMove(e) {
    if (mode !== 'select' && draftWallStart) {
      const screen = pointerToScreen(e);
      const world = screenToWorld(transform, screen.x, screen.y);
      setHoverWorld(resolvePlacementPoint(world).point);
    }

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
      const { point } = resolvePlacementPoint({ x: world.x, z: world.z });
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

  function handleSvgPointerDown(e) {
    if (mode === 'select') {
      onSelect(null);
      return;
    }
    const screen = pointerToScreen(e);
    const world = screenToWorld(transform, screen.x, screen.y);
    const { point } = resolvePlacementPoint(world);
    onCanvasClick(point);
  }

  function startElementBodyDrag(e, el) {
    if (mode !== 'select') return;
    onSelect(`element:${el.id}`);
    const { start, end } = elementEndpoints(el);
    beginDrag(e, { type: 'element-body', id: el.id, originalStart: start, originalEnd: end });
  }

  function startEndpointDrag(e, el, which) {
    if (mode !== 'select') return;
    onSelect(`element:${el.id}`);
    beginDrag(e, { type: 'endpoint', id: el.id, which });
  }

  function startFurnitureDrag(e, obj) {
    if (mode !== 'select') return;
    onSelect(`furniture:${obj.id}`);
    const center = { x: obj.centerX ?? obj.center_x ?? 0, z: obj.centerZ ?? obj.center_z ?? 0 };
    beginDrag(e, { type: 'furniture', id: obj.id, originalCenter: center });
  }

  const draftScreenStart = draftWallStart ? worldToScreen(transform, draftWallStart.x, draftWallStart.z) : null;
  const hoverScreen = hoverWorld ? worldToScreen(transform, hoverWorld.x, hoverWorld.z) : null;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ touchAction: 'none', cursor: mode === 'select' ? 'default' : 'crosshair' }}
      onPointerDown={handleSvgPointerDown}
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
              style={{ cursor: mode === 'select' ? 'move' : 'inherit' }}
              onPointerDown={(e) => startElementBodyDrag(e, el)}
            />
            {isSelected && mode === 'select' ? (
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
          <g key={obj.id} style={{ cursor: mode === 'select' ? 'move' : 'inherit' }} onPointerDown={(e) => startFurnitureDrag(e, obj)}>
            <FurnitureItem object={obj} transform={transform} />
            {isSelected && mode === 'select' ? (
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

      {mode === 'draw-wall' && draftScreenStart ? (
        <>
          <line
            x1={draftScreenStart.x} y1={draftScreenStart.y}
            x2={hoverScreen ? hoverScreen.x : draftScreenStart.x} y2={hoverScreen ? hoverScreen.y : draftScreenStart.y}
            stroke={SELECTED_COLOR} strokeWidth={3} strokeDasharray="6 4"
          />
          <circle cx={draftScreenStart.x} cy={draftScreenStart.y} r={5} fill={SELECTED_COLOR} stroke="#fff" strokeWidth={1.5} />
          {hoverScreen ? <circle cx={hoverScreen.x} cy={hoverScreen.y} r={5} fill={SELECTED_COLOR} stroke="#fff" strokeWidth={1.5} /> : null}
        </>
      ) : null}
    </svg>
  );
}
