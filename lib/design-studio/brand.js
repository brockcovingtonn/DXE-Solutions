/**
 * Northlight Studio — brand constants.
 *
 * "Northlight Studio" is this feature's placeholder working name (see the
 * README) and stays that way in code and comments. Everything a client or
 * staff member actually sees is driven entirely by BRAND below — right now
 * that's set to DXE Solutions, since the studio is launching as a DXE
 * service line rather than a separate brand. This is the ONLY file to edit
 * to rebrand it, whether that's finalizing a standalone studio name later or
 * moving the feature to a different company altogether.
 */

export const BRAND = {
  name: 'DXE Solutions',
  shortName: 'DXE',
  tagline: 'Residential Space Planning & 3D Visualization',
  // Shown under the tagline wherever there's room. Left blank for now since
  // the brand name above already reads as the company itself.
  parentLine: '',
  email: 'dixie@dxesolutions.com',
  phone: '323-364-0810',
  website: 'dxesolutions.com',
  // Quote numbers render as DXE-2026-0001
  quotePrefix: 'DXE',
};

/**
 * Scope language that appears on every proposal. DXE Solutions is a civil
 * engineering firm, so this has to be unambiguous: this service sells
 * conceptual design, and licensed work is a separate engagement.
 */
export const SCOPE_NOTE =
  `${BRAND.name} provides conceptual residential space planning and design ` +
  `visualization. The drawings, models and renderings delivered under this ` +
  `proposal are design and presentation documents. They are not architectural, ` +
  `structural, mechanical, electrical or plumbing construction documents, they ` +
  `are not stamped or sealed by a licensed design professional, and they are not ` +
  `intended or suitable for permit submittal or construction. Where permit ` +
  `drawings, engineering or entitlement services are required, those are ` +
  `provided under a separate ${BRAND.name} engagement and scope of work.`;

export const TERMS_NOTE =
  `A deposit is required to begin work and is non-refundable once design has ` +
  `started. The balance is due on delivery of final files. Revision rounds ` +
  `included in the selected service level are listed above; additional revisions ` +
  `are billed at the hourly rate shown. Changes to the project scope, area or ` +
  `program may require a revised proposal. Dimensions shown on design documents ` +
  `are approximate unless field verification is included and performed.`;

/* DXE Solutions' own navy/gold palette (same tokens used in the proposal PDF
   and the rest of the app). If this feature ever moves to its own brand,
   swap these back to something distinct — nothing outside this file cares
   what the hex values are, only what the role (ink, clay, line...) means. */
export const C = {
  ink: '#2C3E50',
  inkSoft: '#3E5468',
  muted: '#718096',
  line: '#DCE5EC',
  sand: '#F6F8FA',
  paper: '#FFFFFF',
  clay: '#C9A857',
  clayDark: '#A98A3F',
  good: '#065F46',
  warn: '#A8562F',
};

export const S = {
  page: { background: C.sand, minHeight: '100vh', padding: '28px 20px 64px', fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: C.ink },
  shell: { maxWidth: 1080, margin: '0 auto' },
  card: { background: C.paper, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, marginBottom: 18 },
  h1: { fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 },
  h2: { fontSize: 13, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.muted, margin: '0 0 14px' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.inkSoft, marginBottom: 6 },
  input: { width: '100%', padding: '9px 11px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 15, background: C.paper, color: C.ink, boxSizing: 'border-box' },
  btn: { padding: '10px 18px', background: C.ink, color: C.paper, border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnGhost: { padding: '10px 18px', background: 'transparent', color: C.ink, border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: `1px solid ${C.line}`, fontSize: 15 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 },
  small: { fontSize: 12.5, color: C.muted, lineHeight: 1.6 },
};

export const money = (n) =>
  `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
