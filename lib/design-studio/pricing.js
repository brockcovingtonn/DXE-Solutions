/**
 * Northlight Studio pricing engine.
 *
 * Pure functions, no imports, no side effects. Runs identically in the browser
 * (live estimator) and on the server (saved quote, proposal render), which is
 * what guarantees the number the employee sees is the number the client gets.
 *
 * Pricing model:
 *
 *   packageSubtotal = packageBase x sizeBandMultiplier x complexityMultiplier
 *   total           = packageSubtotal + rush + addOns - tradePartnerDiscount + adjustment
 *   total           = max(total, projectTypeMinimum)
 *
 * Square footage moves price through the SIZE BAND, not a per-square-foot rate.
 * That keeps the quote a package price the client can say yes to, while stopping
 * a 1,400 sf ADU from being sold at the 600 sf ADU price.
 */

export const DEFAULT_CONFIG = {
  version: 2,
  depositPct: 0.5,
  rushPct: 0.3,
  tradePartnerDiscountPct: 0.15,
  quoteValidDays: 30,
  roundTo: 25,

  complexity: {
    standard: { label: 'Standard', mult: 1.0, when: 'Reliable existing plans; straightforward layout changes.' },
    complex: { label: 'Complex', mult: 1.15, when: 'Significant reconfiguration, kitchens/baths, level changes, unusual geometry.' },
    high: { label: 'High Complexity', mult: 1.3, when: 'Major reconfiguration, luxury detailing, extensive built-ins, many interconnected spaces.' },
  },

  serviceLevels: {
    essentials: {
      label: 'Essentials',
      concepts: '1',
      revisions: 1,
      model3d: false,
      finishDirection: 'Not included',
      styling: 'Basic placement',
      blurb: 'Clear 2D planning for clients who mainly need the layout resolved.',
    },
    design: {
      label: 'Design',
      concepts: 'Up to 3',
      revisions: 2,
      model3d: true,
      finishDirection: 'Basic direction',
      styling: 'Detailed placement',
      blurb: 'The standard engagement for remodels, ADUs and whole-home visualization.',
      recommended: true,
    },
    premium: {
      label: 'Premium',
      concepts: '3–4',
      revisions: 3,
      model3d: true,
      finishDirection: 'Detailed selections',
      styling: 'Detailed styling',
      blurb: 'Luxury and presentation-focused projects.',
    },
  },

  projectTypes: {
    kitchen: {
      label: 'Single Room',
      note: 'Kitchens, primary suites, baths, living rooms.',
      minimumFee: 950,
      packages: { essentials: 1250, design: 2250, premium: 3500 },
      sizeBands: [
        { label: 'Up to 250 sf', maxSqft: 250, mult: 1.0 },
        { label: '251–450 sf', maxSqft: 450, mult: 1.15 },
        { label: '451–700 sf', maxSqft: 700, mult: 1.3 },
        { label: 'Over 700 sf', maxSqft: null, mult: 1.45 },
      ],
      includedViews: { essentials: 0, design: 3, premium: 5 },
      estHours: { essentials: 10, design: 20, premium: 32 },
    },
    adu: {
      label: 'ADU / Garage Conversion',
      note: 'Detached ADU, garage conversion, JADU, casita.',
      minimumFee: 1500,
      packages: { essentials: 1750, design: 2950, premium: 4500 },
      sizeBands: [
        { label: 'Up to 600 sf', maxSqft: 600, mult: 1.0 },
        { label: '601–900 sf', maxSqft: 900, mult: 1.15 },
        { label: '901–1,200 sf', maxSqft: 1200, mult: 1.3 },
        { label: 'Over 1,200 sf', maxSqft: null, mult: 1.45 },
      ],
      includedViews: { essentials: 0, design: 4, premium: 7 },
      estHours: { essentials: 14, design: 26, premium: 40 },
    },
    partial: {
      label: 'Partial Home / Multi-Room',
      note: 'Kitchen + living + dining, a full first floor, suite + bath.',
      minimumFee: 2200,
      packages: { essentials: 2500, design: 4000, premium: 6000 },
      sizeBands: [
        { label: 'Up to 900 sf', maxSqft: 900, mult: 1.0 },
        { label: '901–1,500 sf', maxSqft: 1500, mult: 1.15 },
        { label: '1,501–2,200 sf', maxSqft: 2200, mult: 1.3 },
        { label: 'Over 2,200 sf', maxSqft: null, mult: 1.45 },
      ],
      includedViews: { essentials: 0, design: 6, premium: 9 },
      estHours: { essentials: 20, design: 38, premium: 58 },
    },
    fullhouse: {
      label: 'Full House',
      note: 'Whole-home planning and visualization.',
      minimumFee: 4000,
      packages: { essentials: 4500, design: 6500, premium: 9500 },
      sizeBands: [
        { label: 'Up to 3,000 sf', maxSqft: 3000, mult: 1.0 },
        { label: '3,001–4,500 sf', maxSqft: 4500, mult: 1.15 },
        { label: '4,501–6,500 sf', maxSqft: 6500, mult: 1.35 },
        { label: 'Over 6,500 sf', maxSqft: null, mult: 1.6 },
      ],
      includedViews: { essentials: 0, design: 8, premium: 14 },
      estHours: { essentials: 34, design: 62, premium: 95 },
    },
  },

  /* Add-ons the client sees as genuine options. `premiumRate` is used instead of
     `rate` when the selected service level is Premium. */
  addOns: {
    siteMeasure: { label: 'Site measure / field verification', unit: 'visit', rate: 450, clientFacing: true },
    extraConcept: { label: 'Additional layout concept', unit: 'concept', rate: 400, clientFacing: true },
    extraRender: { label: 'Additional rendered view', unit: 'view', rate: 450, premiumRate: 650, clientFacing: true },
    revisionHour: { label: 'Additional revision work', unit: 'hour', rate: 150, clientFacing: true },
    finishRoom: { label: 'Finish & material direction', unit: 'room', rate: 225, clientFacing: true },
    stylingRoom: { label: 'Furniture & fixture styling', unit: 'room', rate: 175, clientFacing: true },
    sourceFiles: { label: 'Editable source file handoff', unit: 'project', rate: 250, clientFacing: true },
  },

  /* Internal-only health check. Not shown to clients. */
  targetHourly: 125,
};

export const ADDON_ORDER = [
  'siteMeasure',
  'extraConcept',
  'extraRender',
  'revisionHour',
  'finishRoom',
  'stylingRoom',
  'sourceFiles',
];

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const roundTo = (value, step) => {
  const s = num(step, 0);
  if (s <= 0) return Math.round(value);
  return Math.round(value / s) * s;
};

export function resolveSizeBand(bands, sqft) {
  const list = Array.isArray(bands) ? bands : [];
  const area = num(sqft, 0);
  for (const band of list) {
    if (band.maxSqft === null || band.maxSqft === undefined) return band;
    if (area <= num(band.maxSqft)) return band;
  }
  return list[list.length - 1] || { label: 'Standard', mult: 1 };
}

export function addOnRate(key, config, serviceLevel) {
  const def = config.addOns?.[key];
  if (!def) return 0;
  if (serviceLevel === 'premium' && def.premiumRate != null) return num(def.premiumRate);
  return num(def.rate);
}

export const EMPTY_INPUT = {
  clientId: null,
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  projectAddress: '',
  projectType: 'adu',
  serviceLevel: 'design',
  complexity: 'standard',
  areaSqft: 600,
  rush: false,
  tradePartner: false,
  addOns: {},
  manualAdjustment: 0,
  adjustmentNote: '',
  internalNotes: '',
  includedOverride: null,
  hideAddOnMenu: false,
};

/**
 * @param {object} input  see EMPTY_INPUT
 * @param {object} config a config object shaped like DEFAULT_CONFIG
 * @returns {object} a full quote breakdown, internal + client-safe
 */
export function calculateQuote(input = {}, config = DEFAULT_CONFIG) {
  const cfg = config || DEFAULT_CONFIG;
  const typeKey = cfg.projectTypes?.[input.projectType] ? input.projectType : 'adu';
  const levelKey = cfg.serviceLevels?.[input.serviceLevel] ? input.serviceLevel : 'design';
  const complexityKey = cfg.complexity?.[input.complexity] ? input.complexity : 'standard';

  const type = cfg.projectTypes[typeKey];
  const level = cfg.serviceLevels[levelKey];
  const complexity = cfg.complexity[complexityKey];

  const areaSqft = Math.max(0, num(input.areaSqft, 0));
  const base = num(type.packages?.[levelKey]);
  const band = resolveSizeBand(type.sizeBands, areaSqft);
  const bandMult = num(band.mult, 1);
  const complexityMult = num(complexity.mult, 1);

  const step = num(cfg.roundTo, 25);
  const packageSubtotal = roundTo(base * bandMult * complexityMult, step);
  const sizeAdjustment = roundTo(base * bandMult, step) - base;
  const complexityAdjustment = packageSubtotal - roundTo(base * bandMult, step);

  const rushApplied = Boolean(input.rush);
  const rushAmount = rushApplied ? roundTo(packageSubtotal * num(cfg.rushPct), step) : 0;

  const addOnLines = ADDON_ORDER.filter((key) => cfg.addOns?.[key]).map((key) => {
    const def = cfg.addOns[key];
    const qty = Math.max(0, num(input.addOns?.[key], 0));
    const rate = addOnRate(key, cfg, levelKey);
    return { key, label: def.label, unit: def.unit, qty, rate, amount: qty * rate };
  });
  const selectedAddOns = addOnLines.filter((l) => l.qty > 0);
  const addOnTotal = selectedAddOns.reduce((sum, l) => sum + l.amount, 0);

  const tradeApplied = Boolean(input.tradePartner);
  const tradePct = num(cfg.tradePartnerDiscountPct);
  const tradeDiscount = tradeApplied ? roundTo(packageSubtotal * tradePct, step) : 0;

  const adjustment = num(input.manualAdjustment, 0);

  const rawTotal =
    packageSubtotal + rushAmount + addOnTotal - tradeDiscount + adjustment;
  const minimumFee = num(type.minimumFee, 0);
  // The minimum fee is a reference figure on the rate card only — it's no
  // longer force-applied, so a real discount can go below it. `minimumApplied`
  // stays around purely as an informational flag. Floor at $0 instead (never
  // show a negative price), which is a sanity clamp, not the old business rule.
  const minimumApplied = rawTotal < minimumFee;
  const total = Math.max(0, roundTo(rawTotal, step));

  const depositPct = num(cfg.depositPct, 0.5);
  const deposit = roundTo(total * depositPct, step);
  const balance = total - deposit;

  const estHours = num(type.estHours?.[levelKey], 0);
  const includedViews = num(type.includedViews?.[levelKey], 0);
  const extraViews = Math.max(0, num(input.addOns?.extraRender, 0));

  return {
    inputs: {
      ...input,
      projectType: typeKey,
      serviceLevel: levelKey,
      complexity: complexityKey,
      areaSqft,
    },
    labels: {
      projectType: type.label,
      serviceLevel: level.label,
      complexity: complexity.label,
      sizeBand: band.label,
    },
    package: {
      base,
      sizeBand: { label: band.label, mult: bandMult, amount: sizeAdjustment },
      complexity: { label: complexity.label, mult: complexityMult, amount: complexityAdjustment },
      subtotal: packageSubtotal,
    },
    rush: { applied: rushApplied, pct: num(cfg.rushPct), amount: rushAmount },
    addOnLines,
    selectedAddOns,
    addOnTotal,
    tradePartner: { applied: tradeApplied, pct: tradePct, amount: tradeDiscount },
    adjustment,
    adjustmentNote: input.adjustmentNote || '',
    minimum: { fee: minimumFee, applied: minimumApplied },
    total,
    deposit,
    depositPct,
    balance,
    included: {
      concepts: level.concepts,
      revisions: level.revisions,
      model3d: level.model3d,
      finishDirection: level.finishDirection,
      styling: level.styling,
      renderedViews: includedViews + extraViews,
      baseRenderedViews: includedViews,
      blurb: level.blurb,
    },
    /* Internal-only. The proposal payload strips this. */
    internal: {
      estHours,
      impliedHourly: estHours > 0 ? Math.round(total / estHours) : null,
      targetHourly: num(cfg.targetHourly, 0),
      effectivePerSqft: areaSqft > 0 ? Math.round((total / areaSqft) * 100) / 100 : null,
      belowTarget:
        estHours > 0 && num(cfg.targetHourly, 0) > 0
          ? total / estHours < num(cfg.targetHourly)
          : false,
      minimumApplied,
      configVersion: cfg.version,
    },
  };
}

/**
 * The default "What is included" bullet list for a quote's `included`
 * object (see calculateQuote's return shape). This is the single source of
 * truth both the proposal document and the line-item editor's "reset to
 * default" / starting-point content read from — extracted from what used
 * to be inline JSX so both places can never drift apart.
 */
export function buildIncludedBullets(inc = {}) {
  const bullets = [
    'Existing conditions set up as a working base plan',
    `${inc.concepts} proposed layout concept${inc.concepts === '1' ? '' : 's'}`,
    'Finalised dimensioned 2D floor plan',
    `Furniture and fixture layout — ${String(inc.styling || '').toLowerCase()}`,
  ];
  if (inc.model3d) bullets.push('Complete 3D model of the design');
  if (inc.renderedViews > 0) {
    bullets.push(`${inc.renderedViews} rendered presentation view${inc.renderedViews === 1 ? '' : 's'}`);
  }
  if (inc.finishDirection && inc.finishDirection !== 'Not included') {
    bullets.push(`Material and finish direction — ${String(inc.finishDirection).toLowerCase()}`);
  }
  bullets.push(`${inc.revisions} revision round${inc.revisions === 1 ? '' : 's'}`);
  bullets.push('Presentation-ready PDF package');
  return bullets;
}

/** Strips internal margin math before anything reaches a client surface. */
export function toClientPayload(quote) {
  const { internal, inputs, ...rest } = quote;
  return {
    ...rest,
    inputs: {
      clientName: inputs.clientName,
      projectAddress: inputs.projectAddress,
      projectType: inputs.projectType,
      serviceLevel: inputs.serviceLevel,
      complexity: inputs.complexity,
      areaSqft: inputs.areaSqft,
    },
  };
}

export function validUntil(config = DEFAULT_CONFIG, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + num(config.quoteValidDays, 30));
  return d.toISOString().slice(0, 10);
}
