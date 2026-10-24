// Shared between the admin project page and the client/employee phase
// bar so both read progress the same way: a muted slate at low
// completion blends up to the brand gold exactly at 100%, instead of
// every in-progress phase looking identically "done".
const GRADIENT_START = { r: 160, g: 174, b: 192 };
const GRADIENT_END = { r: 201, g: 168, b: 87 }; // --gold

export function phaseColor(pct) {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  const r = Math.round(GRADIENT_START.r + (GRADIENT_END.r - GRADIENT_START.r) * t);
  const g = Math.round(GRADIENT_START.g + (GRADIENT_END.g - GRADIENT_START.g) * t);
  const b = Math.round(GRADIENT_START.b + (GRADIENT_END.b - GRADIENT_START.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
