/**
 * Pure geometry for rendering/editing a Design Studio room scan's floor
 * plan (walls/doors/windows + furniture) from its `elements`/`objects`
 * jsonb data. No React/DOM dependency — trivially unit-testable, and the
 * exact math a Swift port on native should match.
 *
 * Coordinate system matches RoomPlan's own convention (see native's
 * RoomScanGeometry.swift): world positions are meters on the horizontal
 * XZ plane. World Z maps directly to screen Y — no flip.
 */

export const METERS_TO_FEET = 3.28084;
export const WALL_SNAP_THRESHOLD_METERS = 0.15; // ~6in
export const DEFAULT_WALL_HEIGHT_FT = 8;
const GRID_FT_TO_METERS = 1 / METERS_TO_FEET;

function allPoints(elements, objects) {
  const points = [];
  for (const el of elements || []) {
    points.push({ x: el.startX ?? el.start_x ?? 0, z: el.startZ ?? el.start_z ?? 0 });
    points.push({ x: el.endX ?? el.end_x ?? 0, z: el.endZ ?? el.end_z ?? 0 });
  }
  for (const obj of objects || []) {
    for (const corner of furnitureCorners(obj)) points.push(corner);
  }
  return points;
}

/**
 * Computes the fit-to-canvas transform (world meters -> screen pixels) for
 * a scan's current elements/objects. Recompute this on load, on add/
 * delete/commit, and on "fit to view" — NOT continuously while dragging
 * (see floor-plan-editor plan): re-fitting mid-drag makes the canvas
 * rescale/recenter under the cursor, which is disorienting.
 */
export function computeFitTransform(elements, objects, canvasWidth, canvasHeight, margin = 40) {
  const points = allPoints(elements, objects);
  if (!points.length || !canvasWidth || !canvasHeight) {
    return { scale: 1, offsetX: canvasWidth / 2 || 0, offsetY: canvasHeight / 2 || 0, minX: 0, minY: 0 };
  }
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...zs); // "minY" here means min world-Z, kept as Y to match the screen axis it maps to
  const maxY = Math.max(...zs);
  const spanX = Math.max(maxX - minX, 0.1);
  const spanY = Math.max(maxY - minY, 0.1);
  const scale = Math.min((canvasWidth - margin * 2) / spanX, (canvasHeight - margin * 2) / spanY);
  const offsetX = (canvasWidth - spanX * scale) / 2;
  const offsetY = (canvasHeight - spanY * scale) / 2;
  return { scale, offsetX, offsetY, minX, minY };
}

export function worldToScreen(transform, x, z) {
  return {
    x: (x - transform.minX) * transform.scale + transform.offsetX,
    y: (z - transform.minY) * transform.scale + transform.offsetY,
  };
}

export function screenToWorld(transform, px, py) {
  return {
    x: (px - transform.offsetX) / transform.scale + transform.minX,
    z: (py - transform.offsetY) / transform.scale + transform.minY,
  };
}

/** Four rotated corners of a furniture item's oriented bounding box, in world space (meters). */
export function furnitureCorners(object) {
  const halfW = (object.widthMeters ?? object.width_m ?? 0) / 2;
  const halfD = (object.depthMeters ?? object.depth_m ?? 0) / 2;
  const rotation = object.rotationRadians ?? object.rotation_radians ?? 0;
  const cx = object.centerX ?? object.center_x ?? 0;
  const cz = object.centerZ ?? object.center_z ?? 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const local = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ];
  return local.map(([lx, lz]) => ({
    x: cx + lx * cos - lz * sin,
    z: cz + lx * sin + lz * cos,
  }));
}

export function distanceMeters(x1, z1, x2, z2) {
  return Math.hypot(x2 - x1, z2 - z1);
}

export function distanceFt(x1, z1, x2, z2) {
  return distanceMeters(x1, z1, x2, z2) * METERS_TO_FEET;
}

/** Nearest existing wall/door/window endpoint within thresholdMeters, or null. */
export function snapToEndpoint(point, elements, thresholdMeters = WALL_SNAP_THRESHOLD_METERS) {
  let best = null;
  let bestDist = thresholdMeters;
  for (const el of elements || []) {
    const candidates = [
      { x: el.startX ?? el.start_x ?? 0, z: el.startZ ?? el.start_z ?? 0 },
      { x: el.endX ?? el.end_x ?? 0, z: el.endZ ?? el.end_z ?? 0 },
    ];
    for (const c of candidates) {
      const d = distanceMeters(point.x, point.z, c.x, c.z);
      if (d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
  }
  return best;
}

/** Rounds a world point to the nearest gridFt (default 0.5ft) grid line. */
export function snapToGrid(point, gridFt = 0.5) {
  const gridM = gridFt * GRID_FT_TO_METERS;
  return {
    x: Math.round(point.x / gridM) * gridM,
    z: Math.round(point.z / gridM) * gridM,
  };
}

/** Sensible default height for a newly-drawn wall: average of existing walls, or 8ft if none. */
export function defaultHeightFt(elements) {
  const walls = (elements || []).filter((el) => el.type === 'wall');
  if (!walls.length) return DEFAULT_WALL_HEIGHT_FT;
  const total = walls.reduce((sum, w) => sum + (w.heightFt ?? w.height_ft ?? 0), 0);
  return total / walls.length;
}
