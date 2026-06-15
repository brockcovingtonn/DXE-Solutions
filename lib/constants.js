// Shared dropdown option constants used across admin and portal components

export const PROJECT_TYPES = [
  'Residential — New Construction',
  'Residential — Renovation / Addition',
  'Commercial — New Construction',
  'Commercial — Tenant Improvement',
  'Mixed-Use Development',
  'Permitting',
  'Utilities',
  'Other',
];

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
