import { describe, it, expect } from 'vitest';
import {
  computeFitTransform,
  worldToScreen,
  screenToWorld,
  furnitureCorners,
  distanceFt,
  snapToEndpoint,
  snapToGrid,
  defaultHeightFt,
} from '@/lib/design-studio/floor-plan-geometry';

const WALL_A = { id: 'a', type: 'wall', label: 'Wall 1', lengthFt: 10, heightFt: 8, startX: 0, startZ: 0, endX: 3, endZ: 0 };
const WALL_B = { id: 'b', type: 'wall', label: 'Wall 2', lengthFt: 8, heightFt: 9, startX: 3, startZ: 0, endX: 3, endZ: 2.5 };

describe('computeFitTransform / worldToScreen / screenToWorld', () => {
  it('round-trips world -> screen -> world for arbitrary points', () => {
    const transform = computeFitTransform([WALL_A, WALL_B], [], 900, 900, 40);
    for (const [x, z] of [[0, 0], [3, 0], [3, 2.5], [1.5, 1.25]]) {
      const screen = worldToScreen(transform, x, z);
      const back = screenToWorld(transform, screen.x, screen.y);
      expect(back.x).toBeCloseTo(x, 6);
      expect(back.z).toBeCloseTo(z, 6);
    }
  });

  it('fits all element endpoints within the canvas margin', () => {
    const width = 900;
    const height = 900;
    const margin = 40;
    const transform = computeFitTransform([WALL_A, WALL_B], [], width, height, margin);
    for (const [x, z] of [[0, 0], [3, 0], [3, 2.5]]) {
      const { x: px, y: py } = worldToScreen(transform, x, z);
      expect(px).toBeGreaterThanOrEqual(margin - 0.01);
      expect(px).toBeLessThanOrEqual(width - margin + 0.01);
      expect(py).toBeGreaterThanOrEqual(margin - 0.01);
      expect(py).toBeLessThanOrEqual(height - margin + 0.01);
    }
  });

  it('does not flip the Z axis relative to screen Y', () => {
    const transform = computeFitTransform([{ ...WALL_A, startZ: 0, endZ: 5 }], [], 900, 900, 40);
    const near = worldToScreen(transform, 0, 0);
    const far = worldToScreen(transform, 0, 5);
    expect(far.y).toBeGreaterThan(near.y);
  });

  it('returns a safe default transform for empty input instead of NaN/crash', () => {
    const transform = computeFitTransform([], [], 900, 900, 40);
    expect(Number.isFinite(transform.scale)).toBe(true);
    expect(Number.isFinite(transform.offsetX)).toBe(true);
    expect(Number.isFinite(transform.offsetY)).toBe(true);
  });

  it('includes furniture corners in the fit box, not just element endpoints', () => {
    const farFurniture = {
      id: 'f1', category: 'sofa', label: 'Sofa 1',
      centerX: 20, centerZ: 20, widthMeters: 2, depthMeters: 1, rotationRadians: 0,
    };
    const transform = computeFitTransform([WALL_A], [farFurniture], 900, 900, 40);
    const corners = furnitureCorners(farFurniture);
    for (const corner of corners) {
      const { x: px, y: py } = worldToScreen(transform, corner.x, corner.z);
      expect(px).toBeGreaterThanOrEqual(39);
      expect(px).toBeLessThanOrEqual(861);
      expect(py).toBeGreaterThanOrEqual(39);
      expect(py).toBeLessThanOrEqual(861);
    }
  });
});

describe('furnitureCorners', () => {
  it('computes axis-aligned corners for zero rotation', () => {
    const corners = furnitureCorners({ centerX: 5, centerZ: 5, widthMeters: 2, depthMeters: 1, rotationRadians: 0 });
    expect(corners).toHaveLength(4);
    expect(corners).toContainEqual({ x: 4, z: 4.5 });
    expect(corners).toContainEqual({ x: 6, z: 4.5 });
    expect(corners).toContainEqual({ x: 6, z: 5.5 });
    expect(corners).toContainEqual({ x: 4, z: 5.5 });
  });

  it('rotates corners by 90 degrees (swaps width/depth extents)', () => {
    const corners = furnitureCorners({ centerX: 0, centerZ: 0, widthMeters: 2, depthMeters: 1, rotationRadians: Math.PI / 2 });
    for (const c of corners) {
      expect(Math.abs(c.x)).toBeCloseTo(0.5, 5);
      expect(Math.abs(c.z)).toBeCloseTo(1, 5);
    }
  });
});

describe('distanceFt', () => {
  it('converts a 3-4-5 meter triangle to feet', () => {
    const ft = distanceFt(0, 0, 3, 4);
    expect(ft).toBeCloseTo(5 * 3.28084, 4);
  });
});

describe('snapToEndpoint', () => {
  const elements = [WALL_A, WALL_B];

  it('snaps to the nearest endpoint within threshold', () => {
    const snapped = snapToEndpoint({ x: 3.05, z: 0.02 }, elements, 0.15);
    expect(snapped).toEqual({ x: 3, z: 0 });
  });

  it('returns null when nothing is within threshold', () => {
    const snapped = snapToEndpoint({ x: 10, z: 10 }, elements, 0.15);
    expect(snapped).toBeNull();
  });

  it('does not snap when just outside the threshold', () => {
    const snapped = snapToEndpoint({ x: 3.2, z: 0 }, elements, 0.15);
    expect(snapped).toBeNull();
  });
});

describe('snapToGrid', () => {
  it('rounds to the nearest 0.5ft grid line by default', () => {
    const gridFt = 0.5;
    const gridM = gridFt / 3.28084;
    const point = { x: gridM * 3.2, z: gridM * 1.4 };
    const snapped = snapToGrid(point, gridFt);
    expect(snapped.x).toBeCloseTo(gridM * 3, 6);
    expect(snapped.z).toBeCloseTo(gridM * 1, 6);
  });
});

describe('defaultHeightFt', () => {
  it('averages existing wall heights', () => {
    expect(defaultHeightFt([WALL_A, WALL_B])).toBeCloseTo(8.5, 6);
  });

  it('ignores non-wall elements when averaging', () => {
    const door = { type: 'door', heightFt: 100 };
    expect(defaultHeightFt([WALL_A, WALL_B, door])).toBeCloseTo(8.5, 6);
  });

  it('falls back to 8ft when there are no walls yet', () => {
    expect(defaultHeightFt([])).toBe(8);
  });
});
