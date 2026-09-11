// Shared dropdown option constants used across admin and portal components

export const PROJECT_TYPES = [
  'Residential — New Construction',
  'Residential — ADU',
  'Residential — Renovation / Addition',
  'Commercial — New Construction',
  'Commercial — Tenant Improvement',
  'Mixed-Use Development',
  'Permitting',
  'Utilities',
  'Other',
];

// Default project_phases seeded for a new project, keyed by PROJECT_TYPES.
// Falls back to the "Other" template for any type not listed here.
export const PHASE_TEMPLATES = {
  'Residential — New Construction': ['Pre-Design', 'Permits', 'Site Work', 'Framing', 'MEP', 'Finish'],
  'Residential — ADU': ['Pre-Design', 'Permits', 'Site Work', 'Framing', 'MEP', 'Finish'],
  'Residential — Renovation / Addition': ['Pre-Design', 'Permits', 'Demo & Prep', 'Framing', 'MEP', 'Finish'],
  'Commercial — New Construction': ['Pre-Design', 'Entitlements & Permits', 'Site Work', 'Structural', 'MEP', 'Finish & Close-Out'],
  'Commercial — Tenant Improvement': ['Pre-Design', 'Permits', 'Demo', 'Buildout', 'MEP', 'Finish & Close-Out'],
  'Mixed-Use Development': ['Pre-Design', 'Entitlements & Permits', 'Site Work', 'Structural', 'MEP', 'Finish & Close-Out'],
  Permitting: ['Intake & Scope', 'Submittal', 'Plan Check & Corrections', 'Approval & Permit Issued'],
  Utilities: ['Application', 'Coordination', 'Installation', 'Sign-Off'],
  Other: ['Pre-Design', 'Permits', 'Site Work', 'Framing', 'MEP', 'Finish'],
};

export function getPhaseTemplate(projectType) {
  return PHASE_TEMPLATES[projectType] || PHASE_TEMPLATES.Other;
}

export const TRADE_OPTIONS = [
  'Owner',
  'Contractor',
  'Grading & Drainage',
  'Electrical Engineer',
  'Mechanical',
  'Plumbing',
  'Structural Engineer',
  'Architect',
];

// Broader category list for the Contacts directory — every trade,
// consultant, and stakeholder type DXE deals with across a permitting /
// property development project, not just the handful shown on a
// project's team roster.
export const CONTACT_CATEGORIES = [
  'Owner',
  'General Contractor',
  'Architect',
  'Civil Engineer',
  'Structural Engineer',
  'Electrical Engineer',
  'Mechanical Engineer (MEP)',
  'Plumbing Engineer',
  'Geotechnical / Soils Engineer',
  'Land Surveyor',
  'Landscape Architect',
  'Environmental Consultant',
  'Arborist',
  'Excavation & Grading Contractor',
  'Demolition Contractor',
  'Concrete Contractor',
  'Framing Contractor',
  'Roofing Contractor',
  'Electrical Contractor',
  'Plumbing Contractor',
  'HVAC / Mechanical Contractor',
  'Landscaping Contractor',
  'Pool Contractor',
  'Solar Contractor',
  'Utility Company',
  'Building Department / Plan Checker',
  'Building Inspector',
  'Fire Department / Fire Marshal',
  'Title / Escrow Company',
  'Lender / Bank',
  'Real Estate Agent',
  'Attorney',
  'City / County Services',
  'Bonding / Surety',
  'Equipment Rental / Vendor',
  'Other',
];

export const PHASE_STATES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
  { value: 'na', label: 'N/A' },
];

export const UTILITY_STATUSES = [
  { value: 'not_ready', label: 'Not Ready' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
];

export const UTILITY_TYPES = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'water', label: 'Water' },
  { value: 'gas', label: 'Gas' },
];

export const PERMIT_TYPES = [
  'Building',
  'Grading',
  'Electrical',
  'Plumbing',
  'Mechanical',
  'Demolition',
  'Fire / Life-Safety',
  'Encroachment',
  'Other',
];

export const PERMIT_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_plan_check', label: 'In Plan Check' },
  { value: 'corrections', label: 'Corrections Required' },
  { value: 'approved', label: 'Approved' },
  { value: 'issued', label: 'Issued' },
  { value: 'finaled', label: 'Finaled' },
];

// Permitting / plan-check / utility agencies DXE deals with across the
// Greater Los Angeles + Ventura County area, including the independent
// cities that run their own building & planning departments. Used as
// autocomplete suggestions on the permit Agency field — free text is
// still allowed for anything not listed.
export const PERMIT_AGENCIES = [
  // City of Los Angeles
  'LADBS — LA Dept. of Building & Safety',
  'LADWP — LA Dept. of Water & Power',
  'LA Bureau of Engineering (BOE)',
  'LA Bureau of Sanitation (LASAN)',
  'LA Dept. of City Planning',
  'LA Fire Department (LAFD)',
  'LA Dept. of Transportation (LADOT)',
  'LA Housing Department (LAHD)',
  'Urban Forestry Division (LA)',
  // LA County (unincorporated)
  'LA County Public Works — Building & Safety',
  'LA County Regional Planning',
  'LA County Fire Department',
  'LA County Fire — Health Hazardous Materials',
  'LA County Public Health',
  'LA County Flood Control District',
  // Independent cities — San Fernando / San Gabriel Valley
  'City of Burbank — Community Development',
  'Burbank Water & Power (BWP)',
  'City of Glendale — Building & Safety',
  'Glendale Water & Power (GWP)',
  'City of Pasadena — Building & Safety',
  'Pasadena Water & Power (PWP)',
  'City of South Pasadena',
  'City of San Marino',
  'City of Alhambra',
  'City of Arcadia',
  'City of Monrovia',
  'City of San Fernando',
  'City of Calabasas',
  'City of Agoura Hills',
  'City of Santa Clarita',
  // Independent cities — Westside / South Bay / Gateway
  'City of Santa Monica — Building & Safety',
  'City of Beverly Hills — Community Development',
  'City of West Hollywood',
  'City of Culver City',
  'City of Malibu',
  'City of El Segundo',
  'City of Manhattan Beach',
  'City of Hermosa Beach',
  'City of Redondo Beach',
  'City of Torrance',
  'City of Inglewood',
  'City of Long Beach — Development Services',
  'City of Pomona',
  // Ventura County
  'Ventura County Resource Management Agency — Building & Safety',
  'Ventura County Planning Division',
  'Ventura County Fire Protection District',
  'Ventura County Watershed Protection District',
  'Ventura County Environmental Health',
  'City of Thousand Oaks — Building Division',
  'City of Simi Valley — Building & Safety',
  'City of Moorpark',
  'City of Camarillo',
  'City of Oxnard',
  'City of Ventura (San Buenaventura)',
  'City of Santa Paula',
  'City of Fillmore',
  'City of Port Hueneme',
  'City of Ojai',
  // Utilities & state / regional agencies
  'SoCalGas',
  'Southern California Edison (SCE)',
  'California Coastal Commission',
  'Caltrans — District 7',
  'Regional Water Quality Control Board (LA)',
  'South Coast Air Quality Management District (SCAQMD)',
  'Metropolitan Water District of Southern California',
];

// Toggleable scope catalog for the bid builder (Admin → project →
// Create A Bid). Clicking one on adds a pre-filled line item to the bid
// (category, default description, default unit); the admin can still
// edit or remove any of it, or add a fully custom line item. Grouped so
// the picker can show them under headings.
export const BID_SCOPE_GROUPS = [
  {
    group: 'Site & Structure',
    items: [
      { key: 'demolition', label: 'Demolition', unit: 'LS', description: 'Demolition of existing structure/areas per plans' },
      { key: 'haul_away', label: 'Haul Away / Debris Removal', unit: 'LS', description: 'Removal and disposal of demolition debris' },
      { key: 'grading', label: 'Grading & Site Work', unit: 'LS', description: 'Site grading and preparation' },
      { key: 'concrete', label: 'Concrete / Foundation', unit: 'LS', description: 'Foundation and flatwork concrete' },
      { key: 'framing', label: 'Framing', unit: 'LS', description: 'Rough framing per approved plans' },
      { key: 'roofing', label: 'Roofing Installation', unit: 'SQ', description: 'Roofing system installation' },
      { key: 'windows_doors', label: 'Windows & Doors Installation', unit: 'LS', description: 'Supply and install windows and exterior doors' },
      { key: 'stucco', label: 'Stucco / Exterior Finish', unit: 'SF', description: 'Exterior finish/stucco application' },
      { key: 'fencing', label: 'Fencing', unit: 'LF', description: 'Fencing installation' },
      { key: 'landscaping', label: 'Landscaping', unit: 'LS', description: 'Landscaping and irrigation' },
    ],
  },
  {
    group: 'Interior Finishes',
    items: [
      { key: 'insulation', label: 'Insulation', unit: 'SF', description: 'Wall and ceiling insulation' },
      { key: 'drywall', label: 'Drywall Installation', unit: 'SF', description: 'Drywall hang, tape, and finish' },
      { key: 'painting', label: 'Painting', unit: 'LS', description: 'Interior/exterior painting' },
      { key: 'flooring', label: 'Flooring Installation', unit: 'SF', description: 'Supply and install flooring' },
      { key: 'tile', label: 'Tile Installation', unit: 'SF', description: 'Tile installation (kitchen/bath)' },
      { key: 'baseboard', label: 'Baseboard Installation', unit: 'LF', description: 'Baseboard and trim installation' },
      { key: 'cabinets', label: 'Cabinet Installation', unit: 'LS', description: 'Supply and install cabinetry' },
      { key: 'countertops', label: 'Countertop Installation', unit: 'SF', description: 'Supply and install countertops' },
      { key: 'vanity', label: 'Vanity Installation', unit: 'EA', description: 'Supply and install bathroom vanity' },
    ],
  },
  {
    group: 'MEP',
    items: [
      { key: 'electrical', label: 'Electrical', unit: 'LS', description: 'Electrical rough-in and finish' },
      { key: 'lighting', label: 'Lighting Installation', unit: 'LS', description: 'Light fixture supply and installation' },
      { key: 'plumbing', label: 'Plumbing', unit: 'LS', description: 'Plumbing rough-in and finish' },
      { key: 'fixtures', label: 'Plumbing Fixtures Installation', unit: 'LS', description: 'Supply and install plumbing fixtures' },
      { key: 'mechanical', label: 'Mechanical (HVAC)', unit: 'LS', description: 'HVAC system installation' },
      { key: 'appliances', label: 'Appliance Installation', unit: 'LS', description: 'Appliance delivery and installation' },
    ],
  },
  {
    group: 'Professional Services',
    items: [
      { key: 'general_contractor', label: 'General Contractor Oversight', unit: 'LS', description: 'Project management and on-site supervision' },
      { key: 'engineering', label: 'Engineering / Structural Design', unit: 'LS', description: 'Structural engineering and calculations' },
      { key: 'architectural', label: 'Architectural Design', unit: 'LS', description: 'Architectural design and drawings' },
    ],
  },
];

// Flat lookup, keyed by scope key, for pre-filling a line item.
export const BID_SCOPE_ITEMS = Object.fromEntries(
  BID_SCOPE_GROUPS.flatMap((g) => g.items).map((item) => [item.key, item])
);

export const BID_UNITS = ['LS', 'SF', 'SQ', 'LF', 'EA', 'HR', 'DAY'];

export const BID_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'finalized', label: 'Finalized' },
  { value: 'sent', label: 'Sent' },
];

// Sensible starting milestones for a permitting / construction project.
// The admin can one-click add any of these, then edit dates and notes.
export const MILESTONE_PRESETS = [
  'Contract Signed',
  'Consultants Engaged',
  'Plans Submitted to City',
  '1st Plan-Check Corrections Received',
  'Corrections Resubmitted',
  'Plan Check Approved',
  'Fees Paid',
  'Permit Issued',
  'Utility Applications Submitted',
  'Construction Start',
  'Foundation / Grading Inspection Passed',
  'Framing Inspection Passed',
  'Rough MEP Inspections Passed',
  'Insulation / Drywall Inspection Passed',
  'Utility Service Connected',
  'Final Inspection Passed',
  'Certificate of Occupancy Issued',
  'Project Closeout',
];

// Training categories — its own explicit, ordered list (not derived
// from PROJECT_TYPES) so topic-based categories like "Process Overview"
// can lead the list without polluting the actual project-type dropdown
// used when creating a project. "Permitting" and "Utilities" double as
// both a project type and a training topic — that's intentional, they
// hold both the high-level "how to scope this kind of engagement"
// guidance and the detailed how-to procedures for that topic.
export const TRAINING_CATEGORIES = [
  'Process Overview',
  'Client Onboarding & Workflow',
  'Construction Phase Guide',
  'Permitting',
  'Utilities',
  'City & Agency Portals',
  'Residential — New Construction',
  'Residential — ADU',
  'Residential — Renovation / Addition',
  'Commercial — New Construction',
  'Commercial — Tenant Improvement',
  'Mixed-Use Development',
  'Other',
];
