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
