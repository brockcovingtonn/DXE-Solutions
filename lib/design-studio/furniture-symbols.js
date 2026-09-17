/**
 * Furniture/fixture category catalog for the floor-plan editor's asset
 * library, plus the simple top-down CAD-style symbol each category draws
 * as. This is the single source of truth for default placement size AND
 * what a category looks like — the furniture palette, the placed-object
 * renderer, and "what size does a newly-placed item get" all read from
 * here so they can't drift out of sync with each other.
 *
 * Symbol parts are defined in NORMALIZED local space: x/z range from -1
 * to 1, where 1 means "at the object's half-width/half-depth edge" and 0
 * is the center. A renderer scales each part's x by halfWidthMeters and z
 * by halfDepthMeters, then rotates/translates into world space using the
 * object's rotationRadians/centerX/centerZ — the same rotate-then-
 * translate convention already used for RoomPlan-detected furniture, so
 * manually-placed items (rotation 0) render through the identical pipeline
 * as auto-detected ones.
 *
 * Part shapes: 'rect' {x,z,w,h,rx?} | 'circle' {x,z,r} | 'ellipse' {x,z,rx,rz}
 * | 'line' {x1,z1,x2,z2} | 'dots' {points:[[x,z],...], r}
 * (w/h/r/rx/rz are also normalized fractions, applied per-axis like x/z.)
 */

export const FURNITURE_CATEGORIES = [
  {
    key: 'kitchen_island',
    label: 'Kitchen Island',
    defaultWidthM: 1.8,
    defaultDepthM: 0.9,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2, rx: 0.08 },
      { type: 'rect', x: 0, z: 0.62, w: 1.8, h: 0.3 },
    ],
  },
  { key: 'cabinet', label: 'Cabinet', defaultWidthM: 0.6, defaultDepthM: 0.6, parts: [{ type: 'rect', x: 0, z: 0, w: 2, h: 2 }] },
  {
    key: 'counter',
    label: 'Counter',
    defaultWidthM: 0.6,
    defaultDepthM: 0.6,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2 },
      { type: 'line', x1: -1, z1: -0.75, x2: 1, z2: -0.75 },
    ],
  },
  {
    key: 'desk',
    label: 'Desk',
    defaultWidthM: 1.2,
    defaultDepthM: 0.6,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2 },
      { type: 'rect', x: 0.75, z: 0, w: 0.4, h: 1.6 },
    ],
  },
  {
    key: 'rug',
    label: 'Rug',
    defaultWidthM: 2.0,
    defaultDepthM: 1.4,
    dashed: true,
    unfilled: true,
    parts: [{ type: 'rect', x: 0, z: 0, w: 2, h: 2, rx: 0.1 }],
  },
  {
    key: 'sofa',
    label: 'Sofa',
    defaultWidthM: 2.0,
    defaultDepthM: 0.9,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2, rx: 0.15 },
      { type: 'rect', x: 0, z: -0.7, w: 1.9, h: 0.35 },
    ],
  },
  {
    key: 'chair',
    label: 'Chair',
    defaultWidthM: 0.55,
    defaultDepthM: 0.55,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2, rx: 0.25 },
      { type: 'line', x1: -0.5, z1: 1, x2: 0.5, z2: 1 },
    ],
  },
  {
    key: 'table_rect',
    label: 'Table (rectangular)',
    writeCategory: 'table',
    defaultWidthM: 1.5,
    defaultDepthM: 0.9,
    parts: [{ type: 'rect', x: 0, z: 0, w: 2, h: 2 }],
  },
  {
    key: 'table_round',
    label: 'Table (round)',
    writeCategory: 'table',
    defaultWidthM: 1.1,
    defaultDepthM: 1.1,
    parts: [{ type: 'circle', x: 0, z: 0, r: 1 }],
  },
  {
    key: 'bed',
    label: 'Bed',
    defaultWidthM: 1.5,
    defaultDepthM: 2.0,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2 },
      { type: 'rect', x: 0, z: -0.72, w: 1.6, h: 0.5 },
    ],
  },
  { key: 'storage', label: 'Storage / Shelving', defaultWidthM: 0.9, defaultDepthM: 0.4, parts: [{ type: 'rect', x: 0, z: 0, w: 2, h: 2 }] },
  {
    key: 'television',
    label: 'TV',
    defaultWidthM: 1.2,
    defaultDepthM: 0.1,
    labelOutside: true,
    parts: [{ type: 'rect', x: 0, z: 0, w: 2, h: 2 }],
  },
  { key: 'refrigerator', label: 'Refrigerator', defaultWidthM: 0.9, defaultDepthM: 0.7, parts: [{ type: 'rect', x: 0, z: 0, w: 2, h: 2 }] },
  {
    key: 'stove',
    label: 'Stove / Oven',
    writeCategory: 'stove',
    defaultWidthM: 0.75,
    defaultDepthM: 0.65,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2 },
      { type: 'dots', points: [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]], r: 0.12 },
    ],
  },
  {
    key: 'sink',
    label: 'Sink',
    defaultWidthM: 0.6,
    defaultDepthM: 0.5,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2, rx: 0.2 },
      { type: 'ellipse', x: 0, z: 0, rx: 0.6, rz: 0.5 },
    ],
  },
  {
    key: 'toilet',
    label: 'Toilet',
    defaultWidthM: 0.4,
    defaultDepthM: 0.65,
    labelOutside: true,
    parts: [
      { type: 'rect', x: 0, z: -0.55, w: 1.7, h: 0.5 },
      { type: 'ellipse', x: 0, z: 0.25, rx: 0.9, rz: 0.7 },
    ],
  },
  {
    key: 'bathtub',
    label: 'Bathtub',
    defaultWidthM: 1.5,
    defaultDepthM: 0.75,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2, rx: 0.3 },
      { type: 'rect', x: 0, z: 0, w: 1.5, h: 1.4, rx: 0.3 },
    ],
  },
  {
    key: 'washer_dryer',
    label: 'Washer / Dryer',
    defaultWidthM: 0.65,
    defaultDepthM: 0.65,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2 },
      { type: 'circle', x: 0, z: 0, r: 0.55 },
    ],
  },
  {
    key: 'fireplace',
    label: 'Fireplace',
    defaultWidthM: 1.2,
    defaultDepthM: 0.4,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2 },
      { type: 'rect', x: 0, z: 0.1, w: 1.4, h: 1.2 },
    ],
  },
  {
    key: 'stairs',
    label: 'Stairs',
    defaultWidthM: 1.0,
    defaultDepthM: 3.0,
    parts: [
      { type: 'rect', x: 0, z: 0, w: 2, h: 2 },
      { type: 'line', x1: -1, z1: -0.66, x2: 1, z2: -0.66 },
      { type: 'line', x1: -1, z1: -0.22, x2: 1, z2: -0.22 },
      { type: 'line', x1: -1, z1: 0.22, x2: 1, z2: 0.22 },
      { type: 'line', x1: -1, z1: 0.66, x2: 1, z2: 0.66 },
    ],
  },
];

const BY_WRITE_CATEGORY = new Map();
for (const c of FURNITURE_CATEGORIES) {
  const key = c.writeCategory || c.key;
  // First entry for a given written category (e.g. "table") wins as the
  // fallback render for objects that didn't come from this palette at all
  // (RoomPlan-detected items) — later, more specific palette entries (like
  // table_round) are looked up by their own key, not by writeCategory.
  if (!BY_WRITE_CATEGORY.has(key)) BY_WRITE_CATEGORY.set(key, c);
}
const BY_KEY = new Map(FURNITURE_CATEGORIES.map((c) => [c.key, c]));

/**
 * Resolves the symbol to draw for a placed RoomObject. Round vs.
 * rectangular tables are distinguished purely by aspect ratio (no extra
 * field needed) since both write category "table".
 */
export function symbolForObject(object) {
  const category = object.category || 'storage';
  if (category === 'table') {
    const w = object.widthMeters ?? object.width_m ?? 0;
    const d = object.depthMeters ?? object.depth_m ?? 0;
    if (Math.abs(w - d) < 0.05) return BY_KEY.get('table_round');
    return BY_KEY.get('table_rect');
  }
  return BY_WRITE_CATEGORY.get(category) || BY_WRITE_CATEGORY.get('storage');
}

export function paletteCategory(key) {
  return BY_KEY.get(key);
}
