// Design Studio intake form — single source of truth for its fields, used
// by the public /intake/[token] page, the staff-fill view in the quote
// detail page, and the "Request more info" email's answer summary. Answers
// are stored as { [field.id]: value } in design_studio_quotes.intake.

export const INTAKE_FIELDS = [
  { id: 'vision', label: 'Project vision / goals', type: 'textarea' },
  { id: 'rooms', label: 'Rooms or areas involved', type: 'text' },
  { id: 'timeline', label: 'Desired timeline / target start date', type: 'text' },
  {
    id: 'budget',
    label: 'Budget range',
    type: 'select',
    options: ['Under $10k', '$10k–$25k', '$25k–$50k', '$50k–$100k', '$100k+', 'Not sure yet'],
  },
  {
    id: 'style',
    label: 'Style preferences',
    type: 'multiselect',
    options: ['Modern', 'Traditional', 'Transitional', 'Minimalist', 'Industrial', 'Coastal', 'Farmhouse', 'Eclectic', 'Other'],
  },
  { id: 'inspiration', label: 'Inspiration links / notes', type: 'textarea' },
  { id: 'keep', label: 'Existing furniture or items to keep', type: 'textarea' },
  { id: 'avoid', label: 'Anything to avoid or dislikes', type: 'textarea' },
  { id: 'structural', label: 'Anticipated structural changes', type: 'textarea' },
  { id: 'household', label: 'Pets or children to plan around', type: 'text' },
  { id: 'contact', label: 'Best way / time to reach you', type: 'text' },
  { id: 'notes', label: 'Additional notes', type: 'textarea' },
];

export const EMPTY_INTAKE = INTAKE_FIELDS.reduce((acc, field) => {
  acc[field.id] = field.type === 'multiselect' ? [] : '';
  return acc;
}, {});

function formatAnswer(field, value) {
  if (value == null || value === '') return null;
  if (field.type === 'multiselect') {
    return Array.isArray(value) && value.length ? value.join(', ') : null;
  }
  return String(value);
}

// Plain-text summary of submitted answers, e.g. for logging or a plain-text
// email fallback. Skips unanswered fields.
export function intakeSummaryText(intake) {
  if (!intake) return '';
  return INTAKE_FIELDS.map((field) => {
    const answer = formatAnswer(field, intake[field.id]);
    return answer ? `${field.label}: ${answer}` : null;
  })
    .filter(Boolean)
    .join('\n');
}

// HTML rows for the "Request more info" email / staff summary view.
export function intakeSummaryHtml(intake) {
  if (!intake) return '';
  const rows = INTAKE_FIELDS.map((field) => {
    const answer = formatAnswer(field, intake[field.id]);
    if (!answer) return '';
    return `<tr><td style="padding:4px 12px 4px 0;color:#5b6472;font-size:13px;white-space:nowrap;vertical-align:top;">${field.label}</td><td style="padding:4px 0;font-size:13px;">${answer}</td></tr>`;
  })
    .filter(Boolean)
    .join('');
  return rows ? `<table cellpadding="0" cellspacing="0">${rows}</table>` : '';
}
